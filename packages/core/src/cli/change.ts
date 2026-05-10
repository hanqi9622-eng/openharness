import { Command } from "commander";
import { LocalSpecEngine } from "../engine/spec-engine.js";
import type { ChangeStatus } from "../types/index.js";

export const changeCommand = new Command("change")
  .description("Manage OpenSpec changes")
  .addCommand(
    new Command("create")
      .description("Create a new change")
      .argument("<name>", "Change name (kebab-case)")
      .action(async (name: string) => {
        const projectRoot = process.cwd();
        try {
          const specEngine = new LocalSpecEngine(projectRoot);
          const change = await specEngine.createChange(name);
          console.log(`\n✅ Created change: ${change.name} [${change.status}]\n`);
          console.log(`  Directory: openspec/changes/${name}/`);
          console.log(`  Next: Add proposal.md, design.md, tasks.md\n`);
        } catch (err) {
          console.log(`\n❌ ${(err as Error).message}\n`);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command("status")
      .description("Show active change status")
      .action(async () => {
        const projectRoot = process.cwd();
        try {
          const specEngine = new LocalSpecEngine(projectRoot);
          const active = await specEngine.getActiveChange();
          if (!active) {
            console.log("\nℹ️  No active change.\n");
            return;
          }
          console.log(`\n🔄 Active Change: ${active.name}`);
          console.log(`   Status: ${active.status}`);
          console.log(`   Created: ${active.createdAt}`);
          console.log(`   Updated: ${active.updatedAt}`);
          const artifacts = active.artifacts;
          if (artifacts.proposal) console.log(`   Proposal: ✅`);
          else console.log(`   Proposal: ❌ missing`);
          if (artifacts.design) console.log(`   Design: ✅`);
          else console.log(`   Design: ❌ missing`);
          if (artifacts.tasks) console.log(`   Tasks: ✅`);
          else console.log(`   Tasks: ❌ missing`);
          console.log("");
        } catch {
          console.log("\n📋 OpenSpec not configured. Run 'openharness init' first.\n");
        }
      })
  )
  .addCommand(
    new Command("advance")
      .description("Advance change to next status")
      .argument("<name>", "Change name")
      .argument("<status>", `Next status: ${["proposed", "approved", "applying", "reviewing", "verifying", "archived"].join(" | ")}`)
      .action(async (name: string, status: string) => {
        const projectRoot = process.cwd();
        const validStatuses: ChangeStatus[] = ["draft", "proposed", "approved", "applying", "reviewing", "verifying", "archived"];
        if (!validStatuses.includes(status as ChangeStatus)) {
          console.log(`\n❌ Invalid status: ${status}`);
          console.log(`   Valid: ${validStatuses.join(", ")}\n`);
          process.exit(1);
        }
        try {
          const specEngine = new LocalSpecEngine(projectRoot);
          const change = await specEngine.updateChangeStatus(name, status as ChangeStatus);
          console.log(`\n✅ ${change.name}: ${change.status}\n`);
        } catch (err) {
          console.log(`\n❌ ${(err as Error).message}\n`);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command("archive")
      .description("Archive a completed change")
      .argument("<name>", "Change name")
      .action(async (name: string) => {
        const projectRoot = process.cwd();
        try {
          const specEngine = new LocalSpecEngine(projectRoot);
          await specEngine.archiveChange(name);
          console.log(`\n📦 Archived change: ${name}\n`);
        } catch (err) {
          console.log(`\n❌ ${(err as Error).message}\n`);
          process.exit(1);
        }
      })
  );
