import type { AdapterConfigFile, AdapterEntryConfig } from "../types/index.js";
import type { ProtectedPath, HookDefinition } from "../types/index.js";
import { BaseAdapter } from "./base.js";

export class CopilotAdapter extends BaseAdapter {
  readonly platform = "copilot" as const;
  readonly displayName = "GitHub Copilot";

  getEntryFileName(): string {
    return ".github/copilot-instructions.md";
  }

  getEntryFileContent(projectName: string, config: AdapterEntryConfig): AdapterConfigFile {
    const sections: string[] = [];

    sections.push(`# ${projectName} — Copilot Instructions`);
    sections.push("");
    sections.push("You are an AI development assistant governed by the OpenHarness engineering framework.");
    sections.push("");

    sections.push("## Key References");
    sections.push("");
    if (config.implicitContractsDoc) {
      sections.push(`- **Implicit Contracts (MUST READ)**: ${config.implicitContractsDoc}`);
    }
    if (config.architectureDoc) {
      sections.push(`- **Architecture**: ${config.architectureDoc}`);
    }
    if (config.productDoc) {
      sections.push(`- **Product Rules**: ${config.productDoc}`);
    }
    if (config.standardsDocs?.length) {
      sections.push(`- **Standards**: ${config.standardsDocs.join(", ")}`);
    }
    sections.push("");

    sections.push("## Workflow");
    sections.push("");
    sections.push("1. **Planning**: explore → propose → human approval");
    sections.push("2. **Execution**: ANALYSIS → DESIGN → IMPLEMENTATION → REVIEW → TESTING → COMPLETE");
    sections.push("");

    sections.push("## Rules");
    sections.push("- Gate must pass before any commit");
    sections.push("- All proposals need human review");
    sections.push("- Check implicit contracts before implementation");
    sections.push("- One task per commit");
    sections.push("");

    return {
      path: this.getEntryFileName(),
      content: sections.join("\n"),
    };
  }

  protected getPermissionsPath(): string {
    return ".github/copilot-instructions.md";
  }

  protected getHooksConfigPath(): string {
    return ".github/copilot-instructions.md";
  }

  buildPlatformConfig(protectedPaths: ProtectedPath[], hooks: HookDefinition[]): AdapterConfigFile[] {
    const configs: AdapterConfigFile[] = [];
    const sections: string[] = [];

    if (protectedPaths.length > 0) {
      sections.push("## Protected Paths");
      sections.push("");
      sections.push("The following file patterns are protected. Do NOT modify these files:");
      sections.push("");
      for (const p of protectedPaths) {
        sections.push(`- \`${p.pattern}\` — ${p.category} (${p.severity})`);
      }
      sections.push("");
    }

    const deduped = this.deduplicateHooks(hooks);
    const preWrite = deduped.filter((h) => h.event === "pre_write");
    const postWrite = deduped.filter((h) => h.event === "post_write");

    if (preWrite.length > 0 || postWrite.length > 0) {
      sections.push("## Hook Checks");
      sections.push("");

      if (preWrite.length > 0) {
        sections.push("### Pre-Write");
        sections.push("Before writing any file, these checks must pass:");
        for (const h of preWrite) {
          sections.push(`- Run: \`${this.formatHookCommand(h)}\``);
        }
        sections.push("");
      }

      if (postWrite.length > 0) {
        sections.push("### Post-Write");
        sections.push("After writing files, run these checks:");
        for (const h of postWrite) {
          sections.push(`- Run: \`${this.formatHookCommand(h)}\``);
        }
        sections.push("");
      }
    }

    if (sections.length > 0) {
      configs.push({
        path: ".github/copilot-openharness.md",
        content: sections.join("\n"),
      });
    }

    return configs;
  }
}
