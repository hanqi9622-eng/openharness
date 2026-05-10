import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { WorkspaceConfig, ServiceModule, InheritedConfig, WorkspaceMode } from "../types/index.js";

const WORKSPACE_CONFIG_FILE = "openharness.workspace.yaml";

export class WorkspaceEngine {
  constructor(private projectRoot: string) {}

  loadWorkspaceConfig(): WorkspaceConfig | null {
    const configPath = path.join(this.projectRoot, WORKSPACE_CONFIG_FILE);
    if (!fs.existsSync(configPath)) return null;
    return YAML.parse(fs.readFileSync(configPath, "utf-8")) as WorkspaceConfig;
  }

  saveWorkspaceConfig(config: WorkspaceConfig): void {
    config.updatedAt = new Date().toISOString();
    const configPath = path.join(this.projectRoot, WORKSPACE_CONFIG_FILE);
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configPath, YAML.stringify(config), "utf-8");
  }

  initWorkspace(
    projectName: string,
    platform: string,
    mode: WorkspaceMode,
    services: ServiceModule[]
  ): WorkspaceConfig {
    const config: WorkspaceConfig = {
      mode,
      projectName,
      platform,
      plugins: [],
      services,
      globalContracts: "docs/architecture/global-contracts.md",
      initializedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.saveWorkspaceConfig(config);
    return config;
  }

  getInheritedConfig(serviceName: string): InheritedConfig {
    const config = this.loadWorkspaceConfig();
    if (!config) {
      return {
        globalPlugins: [],
        globalContracts: [],
        globalProtectedPaths: [],
        servicePlugins: [],
        serviceContracts: [],
      };
    }

    const globalContracts = this.loadGlobalContracts(config.globalContracts);
    const globalPlugins = config.plugins;
    const globalProtectedPaths = this.loadGlobalProtectedPaths();

    const service = config.services?.find((s) => s.name === serviceName);
    const servicePlugins = service?.plugins ?? [];
    const serviceContracts = this.loadServiceContracts(serviceName);

    return {
      globalPlugins,
      globalContracts,
      globalProtectedPaths,
      servicePlugins,
      serviceContracts,
    };
  }

  getServiceEntryPath(service: ServiceModule, platform: string): string {
    const entryMap: Record<string, string> = {
      "claude-code": `CLAUDE.md`,
      cursor: `.cursorrules`,
      copilot: `.github/copilot-instructions.md`,
      cline: `.clinerules`,
      codex: `AGENTS.md`,
      trae: `.trae/rules/project_rules.md`,
    };
    if (service.path === ".") {
      return entryMap[platform] ?? "AGENTS.md";
    }
    return path.join(service.path, entryMap[platform] ?? "AGENTS.md");
  }

  generateServiceEntryContent(
    service: ServiceModule,
    platform: string,
    inherited: InheritedConfig
  ): string {
    const sections: string[] = [];

    sections.push(`# ${service.name} — AI Navigation Entry`);
    sections.push("");
    sections.push(
      `> This service is part of a multi-service architecture governed by OpenHarness.`
    );
    sections.push("");

    sections.push("## Service Identity");
    sections.push("");
    sections.push(`- **Name**: ${service.name}`);
    if (service.language) sections.push(`- **Language**: ${service.language}`);
    if (service.framework) sections.push(`- **Framework**: ${service.framework}`);
    sections.push(`- **Path**: \`${service.path}\``);
    sections.push("");

    if (inherited.globalContracts.length > 0) {
      sections.push("## Global Contracts (Inherited, MUST READ)");
      sections.push("");
      for (const contract of inherited.globalContracts) {
        sections.push(`- ${contract}`);
      }
      sections.push("");
    }

    sections.push("## Local References");
    sections.push("");
    sections.push(`- Architecture: \`${service.path}/docs/architecture/index.md\``);
    sections.push(
      `- Implicit Contracts: \`${service.path}/docs/architecture/implicit-contracts.md\``
    );
    sections.push("");

    sections.push("## Unified Workflow");
    sections.push("");
    sections.push("```");
    sections.push("explore → propose → human approval → apply");
    sections.push("  ↓");
    sections.push("ANALYSIS → DESIGN → IMPLEMENTATION → REVIEW → TESTING → COMPLETE");
    sections.push("```");
    sections.push("");
    sections.push("1. **Planning Phase**: explore → propose → human approval → apply");
    sections.push("2. **Execution Phase**: ANALYSIS → DESIGN → IMPLEMENTATION → REVIEW → TESTING → COMPLETE");
    sections.push("");

    sections.push("## Guard Rails");
    sections.push("");
    sections.push("- Gate script must pass before commit");
    sections.push("- Proposals must be human-reviewed");
    sections.push("- **Global contracts must be checked** (affects all services)");
    sections.push("- Local implicit contracts must be checked");
    sections.push("- One task, one commit");
    sections.push("- **Cross-service impact must be assessed** before changes");
    sections.push("");

    return sections.join("\n");
  }

  generateGlobalContracts(services: ServiceModule[]): string {
    const sections: string[] = [];

    sections.push("# Global Contracts — Cross-Service Rules");
    sections.push("");
    sections.push(
      "> These contracts apply to ALL services in this workspace. Violation affects the entire system."
    );
    sections.push("");

    sections.push("## Service Map");
    sections.push("");
    sections.push("| Service | Language | Framework | Path |");
    sections.push("|---------|----------|-----------|------|");
    for (const service of services) {
      sections.push(
        `| ${service.name} | ${service.language ?? "-"} | ${service.framework ?? "-"} | \`${service.path}\` |`
      );
    }
    sections.push("");

    sections.push("## 🔴 Critical Global Contracts");
    sections.push("");
    sections.push("| # | Contract | Reason | Affected Services |");
    sections.push("|---|----------|--------|-------------------|");
    sections.push("| 1 | _(to be filled)_ | — | All |");
    sections.push("");

    sections.push("## 🟡 Important Global Contracts");
    sections.push("");
    sections.push("| # | Contract | Reason | Affected Services |");
    sections.push("|---|----------|--------|-------------------|");
    sections.push("| 1 | _(to be filled)_ | — | — |");
    sections.push("");

    sections.push("## Cross-Service Communication Rules");
    sections.push("");
    sections.push("- All inter-service calls must go through the API Gateway");
    sections.push("- No direct database access across service boundaries");
    sections.push("- API versioning is mandatory for public endpoints");
    sections.push("- Event-driven communication via message bus for async operations");
    sections.push("");

    sections.push("## Shared Resources");
    sections.push("");
    sections.push("- _(Document shared libraries, common configs, shared database schemas)_");
    sections.push("");

    return sections.join("\n");
  }

  generateAutoAnalysisDoc(analysis: {
    services: ServiceModule[];
    languages: string[];
    frameworks: string[];
    buildTools: string[];
    packageManager: string;
    mode: string;
  }): string {
    const sections: string[] = [];

    sections.push("# Project Auto-Analysis Report");
    sections.push("");
    sections.push(`> Generated by OpenHarness auto-analyze`);
    sections.push("");

    sections.push("## Architecture Overview");
    sections.push("");
    sections.push(`- **Mode**: ${analysis.mode}`);
    sections.push(`- **Languages**: ${analysis.languages.join(", ") || "Unknown"}`);
    sections.push(`- **Frameworks**: ${analysis.frameworks.join(", ") || "Unknown"}`);
    sections.push(`- **Build Tools**: ${analysis.buildTools.join(", ") || "Unknown"}`);
    sections.push(`- **Package Manager**: ${analysis.packageManager}`);
    sections.push("");

    if (analysis.services.length > 0) {
      sections.push("## Services Detected");
      sections.push("");
      sections.push("| Service | Language | Framework |");
      sections.push("|---------|----------|-----------|");
      for (const service of analysis.services) {
        sections.push(
          `| ${service.name} | ${service.language ?? "-"} | ${service.framework ?? "-"} |`
        );
      }
      sections.push("");
    }

    sections.push("## Suggested Implicit Contracts");
    sections.push("");
    sections.push("Based on the detected architecture, consider these contracts:");
    sections.push("");

    if (analysis.frameworks.includes("spring-boot")) {
      sections.push("### Spring Boot Conventions");
      sections.push("- JPA entities must not be exposed directly through REST APIs (use DTOs)");
      sections.push("- Service layer must handle all business logic (no logic in controllers)");
      sections.push("- Database migrations must use Flyway/Liquibase (no manual DDL)");
      sections.push("- Use `@Transactional` boundaries explicitly");
      sections.push("");
    }

    if (analysis.languages.includes("typescript") || analysis.languages.includes("javascript")) {
      sections.push("### TypeScript/JavaScript Conventions");
      sections.push("- Strict mode must be enabled in tsconfig.json");
      sections.push("- No `any` types in production code");
      sections.push("- API responses must be typed");
      sections.push("");
    }

    if (analysis.mode === "microservices") {
      sections.push("### Microservices Conventions");
      sections.push("- API versioning is mandatory (v1, v2 prefix)");
      sections.push("- Circuit breakers required for inter-service calls");
      sections.push("- Health check endpoints mandatory (`/actuator/health` or `/health`)");
      sections.push("- Correlation IDs must propagate across service boundaries");
      sections.push("- No shared database between services");
      sections.push("");
    }

    return sections.join("\n");
  }

  generateServiceImplicitContracts(service: ServiceModule): string {
    const sections: string[] = [];

    sections.push(`# ${service.name} — Implicit Contracts`);
    sections.push("");
    sections.push(`> Service-specific pitfalls and conventions for ${service.name}.`);
    sections.push("");

    sections.push("### 🔴 Critical");
    sections.push("| # | Convention | Surface Rule | Actual Requirement |");
    sections.push("|---|-----------|-------------|-------------------|");
    sections.push("| 1 | _(to be filled)_ | — | — |");
    sections.push("");

    sections.push("### 🟡 Important");
    sections.push("| # | Convention | Surface Rule | Actual Requirement |");
    sections.push("|---|-----------|-------------|-------------------|");
    sections.push("| 1 | _(to be filled)_ | — | — |");
    sections.push("");

    sections.push("### 🟢 Note");
    sections.push("| # | Convention | Surface Rule | Actual Requirement |");
    sections.push("|---|-----------|-------------|-------------------|");
    sections.push("| 1 | _(to be filled)_ | — | — |");
    sections.push("");

    return sections.join("\n");
  }

  private loadGlobalContracts(contractsPath?: string): string[] {
    if (!contractsPath) return [];
    const fullPath = path.join(this.projectRoot, contractsPath);
    if (!fs.existsSync(fullPath)) return [];
    const content = fs.readFileSync(fullPath, "utf-8");
    const lines = content.split("\n").filter((l) => l.startsWith("- "));
    return lines;
  }

  private loadGlobalProtectedPaths(): { pattern: string; category: string; severity: string }[] {
    const paths: { pattern: string; category: string; severity: string }[] = [];
    const globalGatesDir = path.join(this.projectRoot, "harness");

    if (fs.existsSync(path.join(globalGatesDir, "protected-paths.json"))) {
      try {
        const content = fs.readFileSync(
          path.join(globalGatesDir, "protected-paths.json"),
          "utf-8"
        );
        return JSON.parse(content);
      } catch {
        // skip
      }
    }

    return paths;
  }

  private loadServiceContracts(serviceName: string): string[] {
    const serviceContractsPath = path.join(
      this.projectRoot,
      "openspec",
      "changes",
      `${serviceName}-contracts.md`
    );
    if (!fs.existsSync(serviceContractsPath)) return [];
    const content = fs.readFileSync(serviceContractsPath, "utf-8");
    return content.split("\n").filter((l) => l.startsWith("- "));
  }
}
