import type { AdapterConfigFile, AdapterEntryConfig } from "../types/index.js";
import type { ProtectedPath, HookDefinition } from "../types/index.js";
import { BaseAdapter } from "./base.js";

export class ClineAdapter extends BaseAdapter {
  readonly platform = "cline" as const;
  readonly displayName = "Cline";

  getEntryFileName(): string {
    return ".clinerules";
  }

  getEntryFileContent(projectName: string, config: AdapterEntryConfig): AdapterConfigFile {
    const sections: string[] = [];

    sections.push(`# ${projectName} — Cline Rules`);
    sections.push("");
    sections.push("You are an AI development assistant governed by the OpenHarness engineering framework.");
    sections.push("");

    sections.push("## References");
    sections.push("");
    if (config.implicitContractsDoc) {
      sections.push(`- Implicit Contracts (MUST): ${config.implicitContractsDoc}`);
    }
    if (config.architectureDoc) {
      sections.push(`- Architecture: ${config.architectureDoc}`);
    }
    if (config.productDoc) {
      sections.push(`- Product: ${config.productDoc}`);
    }
    sections.push("");

    sections.push("## Workflow");
    sections.push("1. Planning: explore → propose → human approval");
    sections.push("2. Execution: ANALYSIS → DESIGN → IMPLEMENTATION → REVIEW → TESTING → COMPLETE");
    sections.push("");

    sections.push("## Rules");
    sections.push("- Gate must pass");
    sections.push("- Proposals need human review");
    sections.push("- Check implicit contracts");
    sections.push("- One task per commit");
    sections.push("");

    return {
      path: this.getEntryFileName(),
      content: sections.join("\n"),
    };
  }

  protected getPermissionsPath(): string {
    return ".clinerules";
  }

  protected getHooksConfigPath(): string {
    return ".clinerules";
  }

  buildPlatformConfig(protectedPaths: ProtectedPath[], hooks: HookDefinition[]): AdapterConfigFile[] {
    const configs: AdapterConfigFile[] = [];
    const sections: string[] = [];

    if (protectedPaths.length > 0) {
      sections.push("## Protected Paths");
      sections.push("");
      sections.push("Do NOT modify files matching these patterns:");
      sections.push("");
      for (const p of protectedPaths) {
        sections.push(`- \`${p.pattern}\` (${p.severity}: ${p.category})`);
      }
      sections.push("");
    }

    const deduped = this.deduplicateHooks(hooks);
    const preWrite = deduped.filter((h) => h.event === "pre_write");
    const postWrite = deduped.filter((h) => h.event === "post_write");

    if (preWrite.length > 0) {
      sections.push("## Pre-Write Hooks");
      sections.push("");
      for (const h of preWrite) {
        sections.push(`- Before writing: run \`${this.formatHookCommand(h)}\``);
      }
      sections.push("");
    }

    if (postWrite.length > 0) {
      sections.push("## Post-Write Hooks");
      sections.push("");
      for (const h of postWrite) {
        sections.push(`- After writing: run \`${this.formatHookCommand(h)}\``);
      }
      sections.push("");
    }

    if (sections.length > 0) {
      configs.push({
        path: ".clinerules-openharness",
        content: sections.join("\n"),
      });
    }

    return configs;
  }
}
