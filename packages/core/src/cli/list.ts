import { Command } from "commander";
import { PluginRegistry } from "../engine/plugin-registry.js";
import { LocalSpecEngine } from "../engine/spec-engine.js";
import { getProjectConfig } from "./init.js";

export const listCommand = new Command("list")
  .description("List plugins, changes, and skills")
  .addCommand(
    new Command("plugins")
      .description("List loaded plugins")
      .action(async () => {
        const projectRoot = process.cwd();
        const registry = new PluginRegistry(projectRoot);
        await registry.loadBuiltinPlugins();

        const config = getProjectConfig(projectRoot);
        const projectPlugins = config?.plugins ?? [];

        if (projectPlugins.length > 0) {
          await registry.loadBuiltinPlugins();
        }

        const plugins = registry.getAllPlugins();
        if (plugins.length === 0) {
          console.log("\n📦 No plugins loaded. Run 'openharness add <plugin>' to add one.\n");
          return;
        }

        console.log("\n📦 Loaded Plugins:\n");
        for (const plugin of plugins) {
          console.log(`  ${plugin.name} v${plugin.version}`);
          console.log(`    ${plugin.description}`);
          if (plugin.provides.skills?.length) {
            console.log(`    Skills: ${plugin.provides.skills.map((s) => s.id).join(", ")}`);
          }
          if (plugin.provides.gates?.length) {
            console.log(`    Gates: ${plugin.provides.gates.map((g) => g.id).join(", ")}`);
          }
          if (plugin.provides.hooks?.length) {
            console.log(`    Hooks: ${plugin.provides.hooks.map((h) => h.id).join(", ")}`);
          }
          console.log("");
        }
      })
  )
  .addCommand(
    new Command("changes")
      .description("List OpenSpec changes")
      .action(async () => {
        const projectRoot = process.cwd();
        try {
          const specEngine = new LocalSpecEngine(projectRoot);
          const changes = await specEngine.listChanges();

          if (changes.length === 0) {
            console.log("\n📋 No changes found.\n");
            return;
          }

          console.log("\n📋 Changes:\n");
          for (const change of changes) {
            const artifacts = change.artifacts;
            const parts: string[] = [];
            if (artifacts.proposal) parts.push("proposal");
            if (artifacts.design) parts.push("design");
            if (artifacts.tasks) parts.push("tasks");
            if (artifacts.specs?.length) parts.push(`${artifacts.specs.length} specs`);

            console.log(`  ${change.name} [${change.status}]`);
            if (parts.length > 0) {
              console.log(`    Artifacts: ${parts.join(", ")}`);
            }
            console.log(`    Updated: ${change.updatedAt}`);
            console.log("");
          }
        } catch {
          console.log("\n📋 OpenSpec not configured. Run 'openharness init' first.\n");
        }
      })
  )
  .addCommand(
    new Command("skills")
      .description("List available skills")
      .action(async () => {
        const projectRoot = process.cwd();
        const registry = new PluginRegistry(projectRoot);
        await registry.loadBuiltinPlugins();

        const skills = registry.getAllSkills();
        if (skills.length === 0) {
          console.log("\n🎯 No skills available.\n");
          return;
        }

        console.log("\n🎯 Available Skills:\n");
        for (const skill of skills) {
          console.log(`  ${skill.id}`);
          if (skill.description) console.log(`    ${skill.description}`);
          if (skill.triggers?.length) console.log(`    Triggers: ${skill.triggers.join(", ")}`);
          console.log("");
        }
      })
  );
