import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import type {
  PluginManifest,
  SkillDefinition,
  AgentDefinition,
  GateDefinition,
  HookDefinition,
  StandardDefinition,
  ProtectedPath,
} from "../types/index.js";
import { validatePluginManifest } from "./validators.js";

export class PluginRegistry {
  private plugins: Map<string, PluginManifest> = new Map();
  private pluginRoots: Map<string, string> = new Map();

  constructor(private projectRoot: string) {}

  async loadBuiltinPlugins(): Promise<void> {
    const thisFileDir = path.dirname(fileURLToPath(import.meta.url));
    const searchDirs = [
      path.resolve(this.projectRoot, "packages"),
      path.resolve(this.projectRoot, "node_modules", "@openharness"),
      path.resolve(thisFileDir, "..", "..", "..", "plugin-spring"),
      path.resolve(thisFileDir, "..", "..", "..", "..", "packages", "plugin-spring"),
    ];

    for (const dir of searchDirs) {
      if (!fs.existsSync(dir)) continue;

      const directManifest = path.join(dir, "openharness.plugin.yaml");
      if (fs.existsSync(directManifest)) {
        try { await this.loadPlugin(dir); } catch (e) { console.warn(`[openharness] Skipping plugin in ${dir}: ${(e as Error).message}`); }
        continue;
      }

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const subDir = path.join(dir, entry.name);
        const manifestPath = path.join(subDir, "openharness.plugin.yaml");
        if (fs.existsSync(manifestPath)) {
          try { await this.loadPlugin(subDir); } catch (e) { console.warn(`[openharness] Skipping plugin in ${subDir}: ${(e as Error).message}`); }
        }
      }
    }
  }

  async loadPlugin(pluginDir: string): Promise<PluginManifest> {
    const manifestPath = path.join(pluginDir, "openharness.plugin.yaml");
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Plugin manifest not found: ${manifestPath}`);
    }

    const content = fs.readFileSync(manifestPath, "utf-8");
    const manifest = YAML.parse(content) as PluginManifest;

    this.validateManifest(manifest);
    this.plugins.set(manifest.name, manifest);
    this.pluginRoots.set(manifest.name, pluginDir);

    return manifest;
  }

  async loadPluginsFromDir(pluginsDir: string): Promise<PluginManifest[]> {
    const loaded: PluginManifest[] = [];

    if (!fs.existsSync(pluginsDir)) {
      return loaded;
    }

    const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subDir = path.join(pluginsDir, entry.name);
        if (fs.existsSync(path.join(subDir, "openharness.plugin.yaml"))) {
          const manifest = await this.loadPlugin(subDir);
          loaded.push(manifest);
        }
      }
    }

    return loaded;
  }

  getPlugin(name: string): PluginManifest | undefined {
    return this.plugins.get(name);
  }

  getPluginDir(name: string): string | undefined {
    return this.pluginRoots.get(name);
  }

  getAllPlugins(): PluginManifest[] {
    return Array.from(this.plugins.values());
  }

  getAllSkills(): SkillDefinition[] {
    return this.getAllPlugins().flatMap(
      (p) => p.provides.skills ?? []
    );
  }

  getAllAgents(): AgentDefinition[] {
    return this.getAllPlugins().flatMap(
      (p) => p.provides.agents ?? []
    );
  }

  getAllGates(): GateDefinition[] {
    return this.getAllPlugins().flatMap(
      (p) => p.provides.gates ?? []
    );
  }

  getAllHooks(): HookDefinition[] {
    return this.getAllPlugins().flatMap(
      (p) => p.provides.hooks ?? []
    );
  }

  getAllStandards(): StandardDefinition[] {
    return this.getAllPlugins().flatMap(
      (p) => p.provides.standards ?? []
    );
  }

  getAllProtectedPaths(): ProtectedPath[] {
    return this.getAllPlugins().flatMap(
      (p) => p.provides.protectedPaths ?? []
    );
  }

  getAllCodeFilePatterns(): string[] {
    return this.getAllPlugins().flatMap(
      (p) => p.provides.codeFilePatterns ?? []
    );
  }

  private validateManifest(manifest: unknown): void {
    const result = validatePluginManifest(manifest);
    if (!result.success) {
      const errors = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new Error(`Invalid plugin manifest: ${errors}`);
    }
  }
}
