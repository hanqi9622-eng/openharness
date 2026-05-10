import fs from "node:fs";
import path from "node:path";
import type { AdapterConfigFile, AdapterEntryConfig, AdapterValidationResult } from "../types/index.js";
import type { ProtectedPath, HookDefinition } from "../types/index.js";
import { BaseAdapter } from "./base.js";

export class ClaudeCodeAdapter extends BaseAdapter {
  readonly platform = "claude-code" as const;
  readonly displayName = "Claude Code";

  getEntryFileName(): string {
    return "CLAUDE.md";
  }

  getEntryFileContent(projectName: string, config: AdapterEntryConfig): AdapterConfigFile {
    const sections: string[] = [];

    sections.push(`# ${projectName} — AI Navigation Entry`);
    sections.push("");
    sections.push("> This file is the navigation entry for AI assistants. It tells AI where to find what.");
    sections.push("");

    sections.push("## You Are");
    sections.push("");
    sections.push("An AI development assistant governed by OpenHarness engineering framework.");
    sections.push("");

    sections.push("## Where to Find What");
    sections.push("");
    sections.push("| Need | Location |");
    sections.push("|------|----------|");

    if (config.architectureDoc) {
      sections.push(`| Project architecture | \`${config.architectureDoc}\` |`);
    }
    if (config.implicitContractsDoc) {
      sections.push(`| Implicit contracts & pitfalls | \`${config.implicitContractsDoc}\` ⚠️ Must read |`);
    }
    if (config.productDoc) {
      sections.push(`| Product rules | \`${config.productDoc}\` |`);
    }
    if (config.standardsDocs?.length) {
      for (const doc of config.standardsDocs) {
        sections.push(`| Standards | \`${doc}\` |`);
      }
    }
    if (config.harnessDoc) {
      sections.push(`| Engineering governance | \`${config.harnessDoc}\` |`);
    }
    if (config.devMapDoc) {
      sections.push(`| Dev navigation | \`${config.devMapDoc}\` |`);
    }
    if (config.gateScript) {
      sections.push(`| Gate check script | \`${config.gateScript}\` |`);
    }

    sections.push("| Active changes | `openspec/changes/` |");
    sections.push("| System specs | `openspec/specs/` |");
    sections.push("");

    sections.push("## Unified Workflow");
    sections.push("");
    sections.push("```");
    sections.push("explore → propose → human approval → apply");
    sections.push("  ↓");
    sections.push("ANALYSIS → DESIGN → IMPLEMENTATION → REVIEW → TESTING → COMPLETE");
    sections.push("```");
    sections.push("");

    sections.push("## Guard Rails (Non-bypassable)");
    sections.push("");
    sections.push("| Protection | Mechanism |");
    sections.push("|------------|-----------|");
    sections.push("| High-risk paths | settings.local.json deny rules |");
    sections.push("| Write protection | guard_write hook |");
    sections.push("| Change context | ensure_change_context hook |");
    sections.push("| Auto-checks | run_checks hook (compile + test after write) |");
    sections.push("| Commit gate | gate.sh full check |");
    sections.push("");

    sections.push("## Key Principles");
    sections.push("");
    sections.push("1. **gate.sh must pass** — hard gate");
    sections.push("2. **proposal must be human-reviewed** — draft mindset");
    sections.push("3. **implicit contracts must be checked** — read implicit-contracts.md");
    sections.push("4. **implementation / review / verification are separate** — each has its own scope");
    sections.push("5. **one task, one commit** — atomicity");
    sections.push("6. **whoever changes code, updates the dev-map**");
    sections.push("");

    return {
      path: this.getEntryFileName(),
      content: sections.join("\n"),
    };
  }

  protected getPermissionsPath(): string {
    return ".claude/settings.local.json";
  }

  protected getHooksConfigPath(): string {
    return ".claude/settings.local.json";
  }

  getSkillsDir(): string {
    return ".claude/skills";
  }

  getAgentsDir(): string {
    return ".claude/agents";
  }

  buildPlatformConfig(protectedPaths: ProtectedPath[], hooks: HookDefinition[]): AdapterConfigFile[] {
    const allow = [
      "Read",
      "Bash(git status*)",
      "Bash(git diff*)",
      "Bash(git log*)",
      "Bash(git add*)",
      "Bash(git commit*)",
      "Bash(mvn clean*)",
      "Bash(mvn compile*)",
      "Bash(mvn test*)",
      "Bash(mvn verify*)",
      "Bash(npm run*)",
      "Bash(npx *)",
      "Bash(openspec *)",
      "Bash(go build*)",
      "Bash(go test*)",
      "Bash(cargo build*)",
      "Bash(cargo test*)",
      "Bash(find *)",
      "Bash(grep *)",
      "Bash(cat *)",
      "Bash(ls *)",
      "Bash(head *)",
      "Bash(tail *)",
      "Bash(wc *)",
      "Bash(mkdir *)",
      "Bash(chmod *)",
      "Bash(curl *)",
      "Bash(python *)",
    ];

    const deny = [
      ...protectedPaths.map((p) => `Write(${p.pattern})`),
      "Bash(rm -rf*)",
      "Bash(DROP TABLE*)",
      "Bash(DROP DATABASE*)",
      "Bash(git push*)",
      "Bash(git reset --hard*)",
      "Bash(sudo *)",
    ];

    const deduped = this.deduplicateHooks(hooks);

    const hookCommands: Record<string, string[]> = {
      pre_write: deduped
        .filter((h) => h.event === "pre_write")
        .map((h) => this.formatClaudeHookCmd(h)),
      post_write: deduped
        .filter((h) => h.event === "post_write")
        .map((h) => this.formatClaudeHookCmd(h)),
    };

    const settings = {
      permissions: { allow, deny },
      hooks: hookCommands,
    };

    return [
      {
        path: ".claude/settings.local.json",
        content: JSON.stringify(settings, null, 2),
      },
    ];
  }

  private formatClaudeHookCmd(hook: HookDefinition): string {
    const basename = path.basename(hook.path);
    const isWin = process.platform === "win32";
    switch (hook.language) {
      case "python":
        return `${isWin ? "python" : "python3"} hooks/${basename}`;
      case "bash":
        return `${isWin ? "sh" : "bash"} hooks/${basename}`;
      case "node":
        return `node hooks/${basename}`;
      default:
        return `${isWin ? "sh" : "bash"} hooks/${basename}`;
    }
  }

  async validateInstallation(projectRoot: string): Promise<AdapterValidationResult> {
    const result = await super.validateInstallation(projectRoot);

    const claudeDir = path.join(projectRoot, ".claude");
    if (!fs.existsSync(claudeDir)) {
      result.warnings.push(".claude/ directory not found");
    }

    return result;
  }
}
