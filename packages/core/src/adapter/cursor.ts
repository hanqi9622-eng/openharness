import type { AdapterConfigFile, AdapterEntryConfig } from "../types/index.js";
import type { ProtectedPath, HookDefinition } from "../types/index.js";
import { BaseAdapter } from "./base.js";

export class CursorAdapter extends BaseAdapter {
  readonly platform = "cursor" as const;
  readonly displayName = "Cursor";

  getEntryFileName(): string {
    return ".cursorrules";
  }

  getEntryFileContent(projectName: string, config: AdapterEntryConfig): AdapterConfigFile {
    const sections: string[] = [];

    sections.push(`# ${projectName} — Cursor Rules`);
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
    return ".cursor/settings.json";
  }

  protected getHooksConfigPath(): string {
    return ".cursor/settings.json";
  }

  buildPlatformConfig(protectedPaths: ProtectedPath[], hooks: HookDefinition[]): AdapterConfigFile[] {
    const configs: AdapterConfigFile[] = [];

    const deduped = this.deduplicateHooks(hooks);
    const preWrite = deduped.filter((h) => h.event === "pre_write");
    const postWrite = deduped.filter((h) => h.event === "post_write");

    const mdcSections: string[] = [];
    mdcSections.push("---");
    mdcSections.push("description: OpenHarness governance rules — permissions, hooks, and guard rails");
    mdcSections.push("alwaysApply: true");
    mdcSections.push("---");
    mdcSections.push("");

    mdcSections.push("# OpenHarness Governance Rules");
    mdcSections.push("");

    if (protectedPaths.length > 0) {
      mdcSections.push("## Protected Paths");
      mdcSections.push("");
      mdcSections.push("The following file patterns are protected. Do NOT modify these files without explicit approval:");
      mdcSections.push("");
      for (const p of protectedPaths) {
        mdcSections.push(`- \`${p.pattern}\` (${p.severity}: ${p.category})`);
      }
      mdcSections.push("");
    }

    if (preWrite.length > 0) {
      mdcSections.push("## Pre-Write Hooks");
      mdcSections.push("");
      mdcSections.push("Before writing files, the following checks must pass:");
      mdcSections.push("");
      for (const h of preWrite) {
        mdcSections.push(`- Run: \`${this.formatHookCommand(h)}\``);
      }
      mdcSections.push("");
    }

    if (postWrite.length > 0) {
      mdcSections.push("## Post-Write Hooks");
      mdcSections.push("");
      mdcSections.push("After writing files, the following checks run automatically:");
      mdcSections.push("");
      for (const h of postWrite) {
        mdcSections.push(`- Run: \`${this.formatHookCommand(h)}\``);
      }
      mdcSections.push("");
    }

    mdcSections.push("## Rules");
    mdcSections.push("- Gate script must pass before any commit");
    mdcSections.push("- All proposals need human review");
    mdcSections.push("- Check implicit contracts before implementation");
    mdcSections.push("- One task per commit");
    mdcSections.push("- Do not modify files matching protected path patterns");
    mdcSections.push("");

    configs.push({
      path: ".cursor/rules/openharness.mdc",
      content: mdcSections.join("\n"),
    });

    return configs;
  }
}
