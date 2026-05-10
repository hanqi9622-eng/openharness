import { describe, it, expect } from "vitest";
import { HookEngine } from "../engine/hook-engine.js";
import { PluginRegistry } from "../engine/plugin-registry.js";
import type { HookContext } from "../types/index.js";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginDir = path.resolve(__dirname, "..", "..", "..", "..", "plugin-spring");

const pluginAvailable = fs.existsSync(path.join(pluginDir, "openharness.plugin.yaml"));

describe("HookEngine", () => {
  it.skipIf(!pluginAvailable)("should block writes to protected paths", async () => {
    const registry = new PluginRegistry(process.cwd());
    await registry.loadPlugin(pluginDir);
    const engine = new HookEngine(registry);
    await engine.initialize();

    const context: HookContext = {
      event: "pre_write",
      filePath: "application-prod.yml",
      projectRoot: process.cwd(),
    };

    const result = await engine.runPreWrite(context);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Protected path");
  });

  it.skipIf(!pluginAvailable)("should allow writes to non-protected paths", async () => {
    const registry = new PluginRegistry(process.cwd());
    await registry.loadPlugin(pluginDir);
    const engine = new HookEngine(registry);
    await engine.initialize();

    const context: HookContext = {
      event: "pre_write",
      filePath: "src/main/java/com/example/UserService.java",
      projectRoot: process.cwd(),
      activeChange: "add-user-feature",
    };

    const result = await engine.runPreWrite(context);
    expect(result.allowed).toBe(true);
  });

  it.skipIf(!pluginAvailable)("should block code writes without active change context", async () => {
    const registry = new PluginRegistry(process.cwd());
    await registry.loadPlugin(pluginDir);
    const engine = new HookEngine(registry);
    await engine.initialize();

    const context: HookContext = {
      event: "pre_write",
      filePath: "src/main/java/com/example/UserService.java",
      projectRoot: process.cwd(),
    };

    const result = await engine.runPreWrite(context);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("No active OpenSpec change context");
  });
});
