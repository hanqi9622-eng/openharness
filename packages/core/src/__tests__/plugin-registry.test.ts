import { describe, it, expect } from "vitest";
import { PluginRegistry } from "../engine/plugin-registry.js";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginDir = path.resolve(__dirname, "..", "..", "..", "..", "plugin-spring");

const pluginAvailable = fs.existsSync(path.join(pluginDir, "openharness.plugin.yaml"));

describe("PluginRegistry", () => {
  it("should throw on missing manifest", async () => {
    const registry = new PluginRegistry(process.cwd());
    await expect(registry.loadPlugin("/nonexistent/path")).rejects.toThrow("Plugin manifest not found");
  });

  it.skipIf(!pluginAvailable)("should load a plugin from a valid manifest", async () => {
    const registry = new PluginRegistry(process.cwd());
    const manifest = await registry.loadPlugin(pluginDir);

    expect(manifest.name).toBe("openharness-spring");
    expect(manifest.version).toBe("1.0.0");
    expect(manifest.provides.skills).toBeDefined();
    expect(manifest.provides.skills!.length).toBeGreaterThan(0);
  });

  it.skipIf(!pluginAvailable)("should aggregate skills from all plugins", async () => {
    const registry = new PluginRegistry(process.cwd());
    await registry.loadPlugin(pluginDir);
    const skills = registry.getAllSkills();

    expect(skills.length).toBeGreaterThan(0);
    expect(skills.some((s) => s.id === "spring-architecture-review")).toBe(true);
    expect(skills.some((s) => s.id === "sql-risk-review")).toBe(true);
  });

  it.skipIf(!pluginAvailable)("should aggregate protected paths from all plugins", async () => {
    const registry = new PluginRegistry(process.cwd());
    await registry.loadPlugin(pluginDir);
    const paths = registry.getAllProtectedPaths();

    expect(paths.length).toBeGreaterThan(0);
    expect(paths.some((p) => p.category === "Production Config")).toBe(true);
  });

  it.skipIf(!pluginAvailable)("should aggregate code file patterns", async () => {
    const registry = new PluginRegistry(process.cwd());
    await registry.loadPlugin(pluginDir);
    const patterns = registry.getAllCodeFilePatterns();

    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns.some((p) => p.includes("java"))).toBe(true);
  });
});
