import type { AdapterConfigFile, AdapterEntryConfig } from "../types/index.js";
import type { ProtectedPath, HookDefinition } from "../types/index.js";
import { BaseAdapter } from "./base.js";

export class CodexAdapter extends BaseAdapter {
  readonly platform = "codex" as const;
  readonly displayName = "OpenAI Codex";

  private escapeTomlString(str: string): string {
    return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  getEntryFileName(): string {
    return "AGENTS.md";
  }

  getEntryFileContent(projectName: string, config: AdapterEntryConfig): AdapterConfigFile {
    const sections: string[] = [];

    sections.push(`# ${projectName} — AI Navigation Entry`);
    sections.push("");
    sections.push("You are an AI development assistant governed by the OpenHarness engineering framework.");
    sections.push("");

    sections.push("## Key References");
    sections.push("");
    if (config.architectureDoc) {
      sections.push(`- **Architecture**: ${config.architectureDoc}`);
    }
    if (config.implicitContractsDoc) {
      sections.push(`- **Implicit Contracts (MUST READ)**: ${config.implicitContractsDoc}`);
    }
    if (config.productDoc) {
      sections.push(`- **Product Rules**: ${config.productDoc}`);
    }
    if (config.standardsDocs?.length) {
      sections.push(`- **Standards**: ${config.standardsDocs.join(", ")}`);
    }
    if (config.harnessDoc) {
      sections.push(`- **Governance**: ${config.harnessDoc}`);
    }
    if (config.devMapDoc) {
      sections.push(`- **Dev Map**: ${config.devMapDoc}`);
    }
    sections.push("- Active changes: `openspec/changes/`");
    sections.push("- System specs: `openspec/specs/`");
    sections.push("");

    sections.push("## Unified Workflow");
    sections.push("");
    sections.push("```");
    sections.push("explore → propose → human approval → apply");
    sections.push("  ↓");
    sections.push("ANALYSIS → DESIGN → IMPLEMENTATION → REVIEW → TESTING → COMPLETE");
    sections.push("```");
    sections.push("");

    sections.push("## Guard Rails");
    sections.push("");
    sections.push("- Gate script must pass before commit");
    sections.push("- Proposals must be human-reviewed");
    sections.push("- Implicit contracts must be checked before implementation");
    sections.push("- One task, one commit");
    sections.push("- Active change context required for all writes");
    sections.push("- Do not modify files matching protected path patterns");
    sections.push("");

    if (config.implicitContractsDoc) {
      sections.push("## Implicit Contracts");
      sections.push("");
      sections.push(`Read and follow all contracts in \`${config.implicitContractsDoc}\` before making any changes.`);
      sections.push("");
    }

    return {
      path: this.getEntryFileName(),
      content: sections.join("\n"),
    };
  }

  protected getPermissionsPath(): string {
    return ".codex/config.toml";
  }

  protected getHooksConfigPath(): string {
    return ".codex/config.toml";
  }

  buildPlatformConfig(protectedPaths: ProtectedPath[], hooks: HookDefinition[]): AdapterConfigFile[] {
    const configs: AdapterConfigFile[] = [];

    const tomlLines: string[] = [];
    tomlLines.push("# Codex CLI configuration — managed by OpenHarness");
    tomlLines.push("");

    tomlLines.push("[sandbox]");
    tomlLines.push("# Permissions: restricted by default, allowlisted below");
    tomlLines.push("");

    const allowedCommands = [
      "git status", "git diff", "git log", "git add", "git commit",
      "mvn clean", "mvn compile", "mvn test", "mvn verify",
      "npm run", "npx",
      "go build", "go test",
      "cargo build", "cargo test",
      "python", "pip",
    ];

    tomlLines.push("[sandbox.allowed_commands]");
    for (const cmd of allowedCommands) {
      tomlLines.push(`"${this.escapeTomlString(cmd)}" = true`);
    }
    tomlLines.push("");

    if (protectedPaths.length > 0) {
      tomlLines.push("[sandbox.protected_paths]");
      for (const p of protectedPaths) {
        tomlLines.push(`"${this.escapeTomlString(p.pattern)}" = "${this.escapeTomlString(p.severity)}"`);
      }
      tomlLines.push("");
    }

    const deduped = this.deduplicateHooks(hooks);
    const preWrite = deduped.filter((h) => h.event === "pre_write");
    const postWrite = deduped.filter((h) => h.event === "post_write");

    if (preWrite.length > 0 || postWrite.length > 0) {
      tomlLines.push("[hooks]");
      if (preWrite.length > 0) {
        tomlLines.push("pre_write = [");
        for (const h of preWrite) {
          tomlLines.push(`  "${this.escapeTomlString(this.formatHookCommand(h))}",`);
        }
        tomlLines.push("]");
      }
      if (postWrite.length > 0) {
        tomlLines.push("post_write = [");
        for (const h of postWrite) {
          tomlLines.push(`  "${this.escapeTomlString(this.formatHookCommand(h))}",`);
        }
        tomlLines.push("]");
      }
      tomlLines.push("");
    }

    configs.push({
      path: ".codex/config.toml",
      content: tomlLines.join("\n"),
    });

    return configs;
  }
}
