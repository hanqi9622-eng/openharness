import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { PluginRegistry } from "../engine/plugin-registry.js";

export const addCommand = new Command("add")
  .description("Add a plugin to the project")
  .argument("<plugin>", "Plugin name or path to plugin directory")
  .option("-o, --output <dir>", "Output directory for plugin files", ".openharness/plugins")
  .action(async (pluginName: string, options) => {
    const projectRoot = process.cwd();
    console.log(`\n📦 Adding plugin: ${pluginName}\n`);

    const registry = new PluginRegistry(projectRoot);
    let pluginDir: string;

    if (fs.existsSync(pluginName) && fs.statSync(pluginName).isDirectory()) {
      pluginDir = path.resolve(pluginName);
    } else {
      const builtinPath = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "..",
        "..",
        "..",
        `plugin-${pluginName.replace("openharness-", "")}`
      );
      if (fs.existsSync(builtinPath)) {
        pluginDir = builtinPath;
      } else {
        console.log(`❌ Plugin not found: ${pluginName}`);
        console.log("\nAvailable built-in plugins:");
        console.log("  - openharness-spring (Spring Boot + JPA)");
        console.log("\nOr provide a path to a plugin directory.");
        process.exit(1);
      }
    }

    try {
      const manifest = await registry.loadPlugin(pluginDir);

      const outputDir = path.join(projectRoot, options.output, manifest.name);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const skills = manifest.provides.skills ?? [];
      const agents = manifest.provides.agents ?? [];
      const hooks = manifest.provides.hooks ?? [];
      const gates = manifest.provides.gates ?? [];
      const standards = manifest.provides.standards ?? [];
      const protectedPaths = manifest.provides.protectedPaths ?? [];

      console.log("  Plugin contents:");
      if (skills.length > 0) console.log(`    Skills: ${skills.map((s) => s.id).join(", ")}`);
      if (agents.length > 0) console.log(`    Agents: ${agents.map((a) => a.id).join(", ")}`);
      if (hooks.length > 0) console.log(`    Hooks: ${hooks.map((h) => h.id).join(", ")}`);
      if (gates.length > 0) console.log(`    Gates: ${gates.map((g) => g.id).join(", ")}`);
      if (standards.length > 0) console.log(`    Standards: ${standards.map((s) => s.id).join(", ")}`);
      if (protectedPaths.length > 0) console.log(`    Protected paths: ${protectedPaths.length} patterns`);

      for (const skill of skills) {
        copyRelative(pluginDir, outputDir, skill.path);
      }
      for (const agent of agents) {
        copyRelative(pluginDir, outputDir, agent.path);
      }
      for (const hook of hooks) {
        copyRelative(pluginDir, outputDir, hook.path);
      }
      for (const standard of standards) {
        copyRelative(pluginDir, outputDir, standard.path);
      }

      console.log(`\n  ✅ Plugin "${manifest.name}" v${manifest.version} installed to ${outputDir}`);
      console.log("\n  Run 'openharness doctor' to verify.\n");
    } catch (err) {
      console.log(`❌ Failed to load plugin: ${(err as Error).message}`);
      process.exit(1);
    }
  });

function copyRelative(srcRoot: string, destRoot: string, relPath: string): void {
  const src = path.join(srcRoot, relPath);
  const dest = path.join(destRoot, relPath);

  if (!fs.existsSync(src)) {
    console.log(`    ⚠️  Source not found: ${relPath}`);
    return;
  }

  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.copyFileSync(src, dest);
  console.log(`    📄 ${relPath}`);
}
