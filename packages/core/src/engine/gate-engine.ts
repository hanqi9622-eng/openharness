import { execFile } from "node:child_process";
import { promisify } from "node:util";
import process from "node:process";
import type { GateCheck, GateConfig, GateResult, GateStatus } from "../types/index.js";
import type { PluginRegistry } from "./plugin-registry.js";

const execFileAsync = promisify(execFile);

function getShell(): string {
  return process.platform === "win32" ? "cmd" : "sh";
}

function getShellArgs(command: string): string[] {
  return process.platform === "win32" ? ["/c", command] : ["-c", command];
}

export class GateEngine {
  constructor(private registry: PluginRegistry) {}

  async run(config?: GateConfig): Promise<GateResult> {
    const startTime = Date.now();
    const gateDefs = this.registry.getAllGates();
    const checks: GateCheck[] = [];

    if (config?.parallel) {
      if (config.failFast) {
        const controller = new AbortController();
        const settled = await Promise.allSettled(
          gateDefs.map((gate) => {
            if (config.skipChecks?.includes(gate.id)) {
              return Promise.resolve({
                id: gate.id,
                name: gate.name ?? gate.id,
                command: gate.command,
                optional: gate.optional ?? false,
                status: "skip" as GateStatus,
              });
            }
            return this.runSingleGate(gate, config, controller.signal);
          })
        );

        let earlyStop = false;
        for (const result of settled) {
          if (result.status === "fulfilled") {
            const check = result.value as GateCheck;
            if (earlyStop && check.status !== "skip") continue;
            checks.push(check);
            if (check.status === "fail" && !check.optional) {
              earlyStop = true;
              controller.abort();
            }
          }
        }
      } else {
        const results = await Promise.all(
          gateDefs.map((gate) => {
            if (config.skipChecks?.includes(gate.id)) {
              return Promise.resolve({
                id: gate.id,
                name: gate.name ?? gate.id,
                command: gate.command,
                optional: gate.optional ?? false,
                status: "skip" as GateStatus,
              });
            }
            return this.runSingleGate(gate, config);
          })
        );
        checks.push(...results);
      }
    } else {
      for (const gate of gateDefs) {
        if (config?.skipChecks?.includes(gate.id)) {
          checks.push({
            id: gate.id,
            name: gate.name ?? gate.id,
            command: gate.command,
            optional: gate.optional ?? false,
            status: "skip" as GateStatus,
          });
          continue;
        }

        const check = await this.runSingleGate(gate, config);
        checks.push(check);

        if (config?.failFast && check.status === "fail" && !gate.optional) {
          break;
        }
      }
    }

    const totalDuration = Date.now() - startTime;

    return {
      passed: checks.every(
        (c) => c.status === "pass" || c.status === "warn" || c.status === "skip"
      ),
      total: checks.length,
      passedCount: checks.filter((c) => c.status === "pass").length,
      failedCount: checks.filter((c) => c.status === "fail").length,
      warnedCount: checks.filter((c) => c.status === "warn").length,
      skippedCount: checks.filter((c) => c.status === "skip").length,
      checks,
      timestamp: new Date().toISOString(),
      duration: totalDuration,
    };
  }

  private async runSingleGate(
    gate: { id: string; name?: string; command: string; optional?: boolean },
    config?: GateConfig,
    signal?: AbortSignal
  ): Promise<GateCheck> {
    const startTime = Date.now();
    const timeout = config?.timeout ?? 120_000;

    if (signal?.aborted) {
      return {
        id: gate.id,
        name: gate.name ?? gate.id,
        command: gate.command,
        optional: gate.optional ?? false,
        status: "skip" as GateStatus,
        output: "Aborted",
        duration: Date.now() - startTime,
      };
    }

    try {
      const { stdout, stderr } = await execFileAsync(getShell(), getShellArgs(gate.command), {
        timeout,
        cwd: process.cwd(),
        signal,
      });

      return {
        id: gate.id,
        name: gate.name ?? gate.id,
        command: gate.command,
        optional: gate.optional ?? false,
        status: "pass" as GateStatus,
        output: stdout || stderr,
        duration: Date.now() - startTime,
      };
    } catch (error: unknown) {
      const err = error as { stdout?: string; stderr?: string; killed?: boolean };
      const isTimeout = err.killed === true;

      if (gate.optional) {
        return {
          id: gate.id,
          name: gate.name ?? gate.id,
          command: gate.command,
          optional: true,
          status: "warn" as GateStatus,
          output: isTimeout ? "Timeout (optional)" : (err.stderr || err.stdout || "Failed"),
          duration: Date.now() - startTime,
        };
      }

      return {
        id: gate.id,
        name: gate.name ?? gate.id,
        command: gate.command,
        optional: false,
        status: "fail" as GateStatus,
        output: isTimeout ? "Timeout" : (err.stderr || err.stdout || "Failed"),
        duration: Date.now() - startTime,
      };
    }
  }
}
