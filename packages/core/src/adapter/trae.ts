import type { AdapterConfigFile, AdapterEntryConfig } from "../types/index.js";
import type { ProtectedPath, HookDefinition } from "../types/index.js";
import { BaseAdapter } from "./base.js";

export class TraeAdapter extends BaseAdapter {
  readonly platform = "trae" as const;
  readonly displayName = "Trae";

  getEntryFileName(): string {
    return ".trae/rules/project_rules.md";
  }

  getEntryFileContent(projectName: string, config: AdapterEntryConfig): AdapterConfigFile {
    const sections: string[] = [];

    sections.push("---");
    sections.push("description: OpenHarness project rules — governance, guard rails, and workflow");
    sections.push("alwaysApply: true");
    sections.push("---");
    sections.push("");

    sections.push(`# ${projectName} — Trae Project Rules`);
    sections.push("");
    sections.push("You are an AI development assistant governed by the OpenHarness engineering framework.");
    sections.push("");

    sections.push("## Navigation");
    sections.push("");
    if (config.architectureDoc) {
      sections.push(`- Architecture: ${config.architectureDoc}`);
    }
    if (config.implicitContractsDoc) {
      sections.push(`- Implicit Contracts (MUST READ): ${config.implicitContractsDoc}`);
    }
    if (config.productDoc) {
      sections.push(`- Product Rules: ${config.productDoc}`);
    }
    if (config.standardsDocs?.length) {
      sections.push(`- Standards: ${config.standardsDocs.join(", ")}`);
    }
    if (config.harnessDoc) {
      sections.push(`- Governance: ${config.harnessDoc}`);
    }
    if (config.devMapDoc) {
      sections.push(`- Dev Map: ${config.devMapDoc}`);
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
    sections.push("- Gate script must pass before commit");
    sections.push("- Proposals must be human-reviewed");
    sections.push("- Implicit contracts must be checked");
    sections.push("- One task, one commit");
    sections.push("");

    return {
      path: this.getEntryFileName(),
      content: sections.join("\n"),
    };
  }

  protected getPermissionsPath(): string {
    return ".trae/settings.json";
  }

  protected getHooksConfigPath(): string {
    return ".trae/settings.json";
  }

  getSkillsDir(): string {
    return ".trae/skills";
  }

  getAgentsDir(): string {
    return ".trae/agents";
  }

  buildPlatformConfig(protectedPaths: ProtectedPath[], hooks: HookDefinition[]): AdapterConfigFile[] {
    const configs: AdapterConfigFile[] = [];

    if (protectedPaths.length > 0) {
      const permSections: string[] = [];
      permSections.push("---");
      permSections.push("description: Protected path rules — files that must not be modified without approval");
      permSections.push("alwaysApply: true");
      permSections.push("---");
      permSections.push("");
      permSections.push("# Protected Paths");
      permSections.push("");
      permSections.push("The following file patterns are protected. Do NOT modify these files:");
      permSections.push("");
      for (const p of protectedPaths) {
        permSections.push(`- \`${p.pattern}\` — ${p.category} (${p.severity})`);
      }
      permSections.push("");

      configs.push({
        path: ".trae/rules/protected-paths.md",
        content: permSections.join("\n"),
      });
    }

    const deduped = this.deduplicateHooks(hooks);
    const preWrite = deduped.filter((h) => h.event === "pre_write");
    const postWrite = deduped.filter((h) => h.event === "post_write");

    if (preWrite.length > 0 || postWrite.length > 0) {
      const hookSections: string[] = [];
      hookSections.push("---");
      hookSections.push("description: Hook execution rules — checks that run before and after file writes");
      hookSections.push("alwaysApply: true");
      hookSections.push("---");
      hookSections.push("");
      hookSections.push("# Hook Rules");
      hookSections.push("");

      if (preWrite.length > 0) {
        hookSections.push("## Pre-Write Checks");
        hookSections.push("");
        hookSections.push("Before writing any file, the following checks must pass:");
        hookSections.push("");
        for (const h of preWrite) {
          hookSections.push(`1. Run \`${this.formatHookCommand(h)}\``);
        }
        hookSections.push("");
      }

      if (postWrite.length > 0) {
        hookSections.push("## Post-Write Checks");
        hookSections.push("");
        hookSections.push("After writing a file, run the following:");
        hookSections.push("");
        for (const h of postWrite) {
          hookSections.push(`1. Run \`${this.formatHookCommand(h)}\``);
        }
        hookSections.push("");
      }

      configs.push({
        path: ".trae/rules/hooks.md",
        content: hookSections.join("\n"),
      });
    }

    return configs;
  }
}
