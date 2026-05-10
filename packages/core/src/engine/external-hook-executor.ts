import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import type { HookContext, HookResult, HookExecutor } from "../types/index.js";
import type { HookDefinition } from "../types/index.js";

const execFileAsync = promisify(execFile);

const HOOK_TIMEOUT = 30_000;

export class ExternalHookExecutor implements HookExecutor {
  id: string;
  event: HookDefinition["event"];

  constructor(
    private hookDef: HookDefinition,
    private hooksDir: string
  ) {
    this.id = hookDef.id;
    this.event = hookDef.event;
  }

  async execute(context: HookContext): Promise<HookResult> {
    const scriptPath = this.resolveScriptPath();
    if (!scriptPath) {
      return {
        allowed: true,
        reason: `Hook script not found: ${this.hookDef.path}`,
      };
    }

    const command = this.buildCommand(scriptPath);
    const env = this.buildEnv(context);

    try {
      const { stdout } = await execFileAsync(command.cmd, command.args, {
        timeout: HOOK_TIMEOUT,
        cwd: context.projectRoot,
        env: { ...process.env, ...env },
      });

      return this.parseOutput(stdout);
    } catch (error: unknown) {
      const err = error as { stdout?: string; stderr?: string; killed?: boolean };
      const output = err.stdout || err.stderr || "Hook execution failed";

      if (this.isBlockingHook()) {
        return {
          allowed: false,
          reason: `Hook "${this.id}" failed: ${output.trim()}`,
        };
      }

      return {
        allowed: true,
        reason: `Hook "${this.id}" warning: ${output.trim()}`,
      };
    }
  }

  private resolveScriptPath(): string | null {
    const directPath = path.join(this.hooksDir, this.hookDef.path);
    if (fs.existsSync(directPath)) return directPath;

    const basename = path.basename(directPath);
    const baseNoExt = basename.replace(/\.(sh|js|py)$/, "");

    if (process.platform === "win32" && this.hookDef.language === "bash") {
      const jsFallback = path.join(this.hooksDir, `${baseNoExt}.js`);
      if (fs.existsSync(jsFallback)) return jsFallback;
    }

    return null;
  }

  private buildCommand(scriptPath: string): { cmd: string; args: string[] } {
    const isWin = process.platform === "win32";

    switch (this.hookDef.language) {
      case "python":
        return { cmd: isWin ? "python" : "python3", args: [scriptPath] };
      case "node":
        return { cmd: "node", args: [scriptPath] };
      case "bash":
      default:
        return { cmd: isWin ? "sh" : "bash", args: [scriptPath] };
    }
  }

  private buildEnv(context: HookContext): Record<string, string> {
    return {
      OPENHARNESS_EVENT: context.event,
      OPENHARNESS_FILE_PATH: context.filePath,
      OPENHARNESS_PROJECT_ROOT: context.projectRoot,
      OPENHARNESS_ACTIVE_CHANGE: context.activeChange ?? "",
    };
  }

  private parseOutput(stdout: string): HookResult {
    const output = stdout.trim();

    if (!output) {
      return { allowed: true };
    }

    try {
      const parsed = JSON.parse(output);
      if (typeof parsed.allowed === "boolean") {
        return {
          allowed: parsed.allowed,
          reason: parsed.reason ?? undefined,
          modified: parsed.modified ?? undefined,
          modifiedContent: parsed.modifiedContent ?? undefined,
        };
      }
    } catch {
      // not JSON, treat as plain text
    }

    const lowerOutput = output.toLowerCase();
    if (lowerOutput.startsWith("deny") || lowerOutput.startsWith("block") || lowerOutput.startsWith("reject")) {
      return {
        allowed: false,
        reason: output,
      };
    }

    return { allowed: true };
  }

  private isBlockingHook(): boolean {
    return this.hookDef.event === "pre_write" || this.hookDef.event === "pre_commit";
  }
}
