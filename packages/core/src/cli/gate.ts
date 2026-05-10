import { Command } from "commander";
import { PluginRegistry } from "../engine/plugin-registry.js";
import { GateEngine } from "../engine/gate-engine.js";

export const gateCommand = new Command("gate")
  .description("Run gate checks")
  .option("--skip <checks>", "Comma-separated list of check IDs to skip")
  .option("--fail-fast", "Stop on first failure")
  .option("--parallel", "Run checks in parallel")
  .action(async (options) => {
    const projectRoot = process.cwd();
    console.log("\n🚧 Running Gate Checks...\n");

    const registry = new PluginRegistry(projectRoot);
    try {
      await registry.loadBuiltinPlugins();
    } catch {
      console.log("❌ No plugins loaded. Run 'openharness add' first.");
      process.exit(1);
    }

    const engine = new GateEngine(registry);
    const config = {
      skipChecks: options.skip ? options.skip.split(",") : undefined,
      failFast: options.failFast ?? false,
      parallel: options.parallel ?? false,
    };

    const result = await engine.run(config);

    console.log("────────────────────────────────────────");
    for (const check of result.checks) {
      const icon = check.status === "pass" ? "✅" : check.status === "warn" ? "⚠️ " : check.status === "skip" ? "⏭️ " : "❌";
      const duration = check.duration ? ` (${check.duration}ms)` : "";
      console.log(`  ${icon} ${check.name}${duration}`);
      if (check.output && check.status === "fail") {
        const lines = check.output.split("\n").slice(0, 5);
        for (const line of lines) {
          console.log(`     ${line}`);
        }
      }
    }
    console.log("────────────────────────────────────────");

    console.log(`\n  Total: ${result.total} | Pass: ${result.passedCount} | Fail: ${result.failedCount} | Warn: ${result.warnedCount} | Skip: ${result.skippedCount}`);
    console.log(`  Duration: ${result.duration}ms\n`);

    if (!result.passed) {
      console.log("❌ Gate check FAILED. Fix the issues above before committing.\n");
      process.exit(1);
    }

    console.log("✅ All gate checks passed!\n");
  });
