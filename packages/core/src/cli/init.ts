import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { Command } from "commander";
import YAML from "yaml";
import { getAdapter, getAllAdapters } from "../adapter/index.js";
import type { AIPlatform, AIPlatformAdapter, ProjectAnalysis } from "../types/index.js";
import type { PluginManifest } from "../types/index.js";
import { PluginRegistry } from "../engine/plugin-registry.js";
import { WorkspaceEngine } from "../engine/workspace-config.js";
import { detectProjectStructure, detectCrossServiceDependencies } from "../engine/workspace-engine.js";
import { writeFile, createDirectory, createTemplateIfNotExists } from "./utils.js";
import {
  deployPermissionsAndHooks,
  deployHooksFiles,
  deploySkillsAndAgents,
  createCommonStructure,
  detectPlatform,
  installGitPreCommitHook,
} from "./deploy.js";

const PROJECT_CONFIG_FILE = "openharness.yaml";

interface ProjectConfig {
  platform: AIPlatform;
  projectName: string;
  plugins: string[];
  initializedAt: string;
  updatedAt: string;
}

function loadProjectConfig(projectRoot: string): ProjectConfig | null {
  const configPath = path.join(projectRoot, PROJECT_CONFIG_FILE);
  if (!fs.existsSync(configPath)) return null;
  return YAML.parse(fs.readFileSync(configPath, "utf-8")) as ProjectConfig;
}

export function saveProjectConfig(projectRoot: string, config: ProjectConfig): void {
  config.updatedAt = new Date().toISOString();
  writeFile(path.join(projectRoot, PROJECT_CONFIG_FILE), YAML.stringify(config));
}

export function getProjectConfig(projectRoot: string): ProjectConfig | null {
  return loadProjectConfig(projectRoot);
}

export const initCommand = new Command("init")
  .description("Initialize OpenHarness in the current project")
  .option("-p, --platform <platform>", "AI platform (claude-code, cursor, copilot, cline, codex, trae)")
  .option("-n, --name <name>", "Project name")
  .option("--skip-hooks", "Skip hook installation")
  .option("--skip-standards", "Skip standards templates")
  .option("--auto-analyze", "Auto-analyze project structure and generate documentation")
  .action(async (options) => {
    const projectRoot = process.cwd();
    const projectName = options.name || path.basename(projectRoot);

    console.log(`\n🚀 Initializing OpenHarness for "${projectName}"...\n`);

    let platform = options.platform as AIPlatform | undefined;
    if (!platform) {
      platform = detectPlatform(projectRoot);
    }
    if (!platform) {
      console.log("Available AI platforms:");
      for (const a of getAllAdapters()) {
        console.log(`  - ${a.platform}: ${a.displayName}`);
      }
      console.log("\nUsage: openharness init --platform <platform>");
      process.exit(1);
    }

    const adapter = getAdapter(platform);
    console.log(`📋 AI Platform: ${adapter.displayName}`);

    const analysis = detectProjectStructure(projectRoot);
    console.log(`📐 Project mode: ${analysis.mode} (${analysis.services.length} service(s) detected)`);
    if (analysis.services.length > 0) {
      for (const svc of analysis.services) {
        console.log(`  - ${svc.name}: ${svc.language ?? "?"} / ${svc.framework ?? "?"}`);
      }
    }

    const registry = new PluginRegistry(projectRoot);
    await registry.loadBuiltinPlugins();
    const plugins = registry.getAllPlugins();
    if (plugins.length > 0) {
      console.log(`📦 Plugins found: ${plugins.map((p) => p.name).join(", ")}`);
    }

    if (analysis.mode !== "single" && analysis.services.length > 1) {
      console.log(`\n🌐 Multi-service workspace detected, initializing workspace mode...\n`);
      await initWorkspace(projectRoot, projectName, platform, adapter, analysis, registry, plugins, options);
    } else {
      await initSingle(projectRoot, projectName, platform, adapter, registry, plugins, options, analysis);
    }
  });

async function initSingle(
  projectRoot: string,
  projectName: string,
  platform: AIPlatform,
  adapter: AIPlatformAdapter,
  registry: PluginRegistry,
  plugins: PluginManifest[],
  options: { skipHooks?: boolean; skipStandards?: boolean; autoAnalyze?: boolean },
  analysis: ProjectAnalysis
): Promise<void> {
  const entryConfig = {
    architectureDoc: "docs/architecture/index.md",
    implicitContractsDoc: "docs/architecture/implicit-contracts.md",
    productDoc: "docs/product/index.md",
    standardsDocs: ["docs/standards/"],
    harnessDoc: "harness/HARNESS.md",
    devMapDoc: "harness/dev-map.md",
    gateScript: "harness/gate.sh",
  };

  const entryFile = adapter.getEntryFileContent(projectName, entryConfig);
  writeFile(path.join(projectRoot, entryFile.path), entryFile.content);
  console.log(`  ✅ Created ${entryFile.path}`);

  const protectedPaths = registry.getAllProtectedPaths();
  const hooks = registry.getAllHooks();

  await deployPermissionsAndHooks(projectRoot, adapter, protectedPaths, hooks);
  deployHooksFiles(projectRoot, registry, plugins, hooks, options.skipHooks);
  deploySkillsAndAgents(projectRoot, adapter, registry, plugins);
  createCommonStructure(projectRoot, projectName, options, analysis);

  const projectConfig: ProjectConfig = {
    platform,
    projectName,
    plugins: plugins.map((p) => p.name),
    initializedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveProjectConfig(projectRoot, projectConfig);
  console.log(`  ✅ Created ${PROJECT_CONFIG_FILE}`);

  installGitPreCommitHook(projectRoot);

  console.log("\n✨ OpenHarness initialized successfully!\n");
  console.log("Next steps:");
  console.log("  1. Review docs/architecture/index.md to verify project description");
  console.log("  2. Fill in docs/architecture/implicit-contracts.md with your project's pitfalls");
  console.log("  3. Run 'openharness doctor' to verify installation");
  console.log("");
}

async function initWorkspace(
  projectRoot: string,
  projectName: string,
  platform: AIPlatform,
  adapter: AIPlatformAdapter,
  analysis: ProjectAnalysis,
  registry: PluginRegistry,
  plugins: PluginManifest[],
  options: { skipHooks?: boolean; skipStandards?: boolean; autoAnalyze?: boolean }
): Promise<void> {
  const wsEngine = new WorkspaceEngine(projectRoot);

  wsEngine.initWorkspace(projectName, platform, analysis.mode, analysis.services);
  console.log(`  ✅ Created openharness.workspace.yaml`);

  const globalContracts = wsEngine.generateGlobalContracts(analysis.services);
  writeFile(path.join(projectRoot, "docs", "architecture", "global-contracts.md"), globalContracts);
  console.log("  ✅ Created docs/architecture/global-contracts.md");

  if (options.autoAnalyze) {
    const analysisDoc = wsEngine.generateAutoAnalysisDoc(analysis);
    createTemplateIfNotExists(
      path.join(projectRoot, "docs", "architecture", "auto-analysis.md"),
      analysisDoc
    );
    console.log("  ✅ Created auto-analysis report");
  }

  const crossDeps = detectCrossServiceDependencies(projectRoot, analysis.services);
  if (crossDeps.length > 0) {
    console.log(`\n  🔗 Cross-service dependencies detected:`);
    for (const dep of crossDeps) {
      console.log(`    - ${dep.sourceService} → ${dep.targetServices.join(", ")} (${dep.impactType})`);
    }
  }

  for (const service of analysis.services) {
    console.log(`\n  📦 Initializing service: ${service.name}`);

    const inherited = wsEngine.getInheritedConfig(service.name);
    const serviceEntry = wsEngine.generateServiceEntryContent(service, platform, inherited);
    const entryPath = wsEngine.getServiceEntryPath(service, platform);
    writeFile(path.join(projectRoot, entryPath), serviceEntry);
    console.log(`    ✅ Created ${entryPath}`);

    if (service.path !== ".") {
      const serviceDocsDir = path.join(projectRoot, service.path, "docs", "architecture");
      createDirectory(serviceDocsDir);

      if (!options.skipStandards) {
        const contractsContent = wsEngine.generateServiceImplicitContracts(service);
        createTemplateIfNotExists(
          path.join(serviceDocsDir, "implicit-contracts.md"),
          contractsContent
        );
        console.log(`    ✅ Created ${service.path}/docs/architecture/implicit-contracts.md`);
      }
    }
  }

  const rootEntryConfig = {
    architectureDoc: "docs/architecture/index.md",
    implicitContractsDoc: "docs/architecture/global-contracts.md",
    productDoc: "docs/product/index.md",
    standardsDocs: ["docs/standards/"],
    harnessDoc: "harness/HARNESS.md",
    devMapDoc: "harness/dev-map.md",
    gateScript: "harness/gate.sh",
  };

  const rootEntry = adapter.getEntryFileContent(projectName, rootEntryConfig);
  const rootEntryPath = path.join(projectRoot, rootEntry.path);
  if (!fs.existsSync(rootEntryPath)) {
    writeFile(rootEntryPath, rootEntry.content);
    console.log(`  ✅ Created root ${rootEntry.path}`);
  }

  const protectedPaths = registry.getAllProtectedPaths();
  const hooks = registry.getAllHooks();

  await deployPermissionsAndHooks(projectRoot, adapter, protectedPaths, hooks);
  deployHooksFiles(projectRoot, registry, plugins, hooks, options.skipHooks);
  deploySkillsAndAgents(projectRoot, adapter, registry, plugins);
  createCommonStructure(projectRoot, projectName, options, analysis);

  const projectConfig: ProjectConfig = {
    platform,
    projectName,
    plugins: plugins.map((p) => p.name),
    initializedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveProjectConfig(projectRoot, projectConfig);
  console.log(`  ✅ Created ${PROJECT_CONFIG_FILE}`);

  installGitPreCommitHook(projectRoot);

  console.log("\n✨ OpenHarness workspace initialized successfully!\n");
  console.log("Next steps:");
  console.log("  1. Review docs/architecture/global-contracts.md for cross-service rules");
  console.log("  2. Fill in each service's implicit-contracts.md");
  console.log("  3. Edit docs/architecture/index.md to describe the overall architecture");
  console.log("  4. Run 'openharness doctor' to verify installation");
  console.log("");
}
