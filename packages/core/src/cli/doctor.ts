import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { getAdapter, getAllAdapters } from "../adapter/index.js";
import { PluginRegistry } from "../engine/plugin-registry.js";
import { LocalSpecEngine } from "../engine/spec-engine.js";
import { WorkspaceEngine } from "../engine/workspace-config.js";
import { getProjectConfig } from "./init.js";

export const doctorCommand = new Command("doctor")
  .description("Verify OpenHarness installation")
  .action(async () => {
    const projectRoot = process.cwd();
    console.log("\n🔍 OpenHarness Installation Check\n");

    let allPassed = true;

    allPassed = checkProjectConfig(projectRoot) && allPassed;
    allPassed = checkCoreStructure(projectRoot) && allPassed;
    allPassed = checkOpenSpecStructure(projectRoot) && allPassed;
    allPassed = await checkAIPlatform(projectRoot) && allPassed;
    allPassed = await checkPlugins(projectRoot) && allPassed;
    allPassed = await checkActiveChange(projectRoot) && allPassed;
    allPassed = checkWorkspace(projectRoot) && allPassed;

    console.log("");
    if (allPassed) {
      console.log("✅ OpenHarness installation looks good!\n");
    } else {
      console.log("❌ Some checks failed. Run 'openharness init' to fix.\n");
      process.exit(1);
    }
  });

function checkProjectConfig(projectRoot: string): boolean {
  console.log("⚙️  Project Config:");
  const config = getProjectConfig(projectRoot);
  if (config) {
    console.log(`  ✅ openharness.yaml found`);
    console.log(`     Platform: ${config.platform}`);
    console.log(`     Plugins: ${config.plugins.join(", ") || "none"}`);
    return true;
  }
  console.log("  ❌ openharness.yaml not found — run 'openharness init' first");
  return false;
}

function checkCoreStructure(projectRoot: string): boolean {
  console.log("\n📁 Core Structure:");
  let passed = true;

  const checks = [
    { path: "docs/architecture", desc: "Architecture docs" },
    { path: "docs/architecture/implicit-contracts.md", desc: "Implicit contracts" },
    { path: "openspec-config.yaml", desc: "OpenSpec config" },
    { path: "openspec", desc: "OpenSpec directory" },
  ];

  for (const check of checks) {
    const fullPath = path.join(projectRoot, check.path);
    if (fs.existsSync(fullPath)) {
      console.log(`  ✅ ${check.desc}: ${check.path}`);
    } else {
      console.log(`  ❌ ${check.desc}: ${check.path} — missing`);
      passed = false;
    }
  }

  return passed;
}

function checkOpenSpecStructure(projectRoot: string): boolean {
  console.log("\n📋 OpenSpec Structure:");

  const checks = [
    { path: "openspec/changes", desc: "Changes directory" },
    { path: "openspec/specs", desc: "Specs directory" },
    { path: "openspec/changes/archive", desc: "Archive directory" },
  ];

  for (const check of checks) {
    const fullPath = path.join(projectRoot, check.path);
    if (fs.existsSync(fullPath)) {
      console.log(`  ✅ ${check.desc}: ${check.path}`);
    } else {
      console.log(`  ⚠️  ${check.desc}: ${check.path} — missing (created on first use)`);
    }
  }

  return true;
}

async function checkAIPlatform(projectRoot: string): Promise<boolean> {
  const config = getProjectConfig(projectRoot);
  console.log("\n📡 AI Platform:");

  if (config?.platform) {
    const adapter = getAdapter(config.platform);
    const result = await adapter.validateInstallation(projectRoot);
    console.log(`  Platform: ${adapter.displayName}`);

    const entryFile = path.join(projectRoot, adapter.getEntryFileName());
    if (fs.existsSync(entryFile)) {
      console.log(`  ✅ Entry file: ${adapter.getEntryFileName()}`);
    } else {
      console.log(`  ❌ Entry file missing: ${adapter.getEntryFileName()}`);
      return false;
    }

    for (const err of result.errors) {
      console.log(`  ❌ ${err}`);
    }
    for (const w of result.warnings) {
      console.log(`  ⚠️  ${w}`);
    }

    const skillsDir = path.join(projectRoot, adapter.getSkillsDir());
    if (fs.existsSync(skillsDir)) {
      const skills = fs.readdirSync(skillsDir);
      console.log(`  ✅ Skills deployed: ${skills.length} (${skills.join(", ") || "empty"})`);
    } else {
      console.log(`  ⚠️  Skills directory not found: ${adapter.getSkillsDir()}`);
    }

    return result.errors.length === 0;
  }

  for (const adapter of getAllAdapters()) {
    const entryFile = path.join(projectRoot, adapter.getEntryFileName());
    if (fs.existsSync(entryFile)) {
      console.log(`  ✅ ${adapter.displayName}: ${adapter.getEntryFileName()} found`);
    }
  }
  return true;
}

async function checkPlugins(projectRoot: string): Promise<boolean> {
  console.log("\n📦 Plugins:");
  const registry = new PluginRegistry(projectRoot);
  await registry.loadBuiltinPlugins();
  const plugins = registry.getAllPlugins();

  if (plugins.length === 0) {
    console.log("  ⚠️  No plugins loaded");
    return true;
  }

  for (const plugin of plugins) {
    const skillCount = plugin.provides.skills?.length ?? 0;
    const gateCount = plugin.provides.gates?.length ?? 0;
    const hookCount = plugin.provides.hooks?.length ?? 0;
    console.log(`  ✅ ${plugin.name} v${plugin.version} (${skillCount} skills, ${gateCount} gates, ${hookCount} hooks)`);
  }
  return true;
}

async function checkActiveChange(projectRoot: string): Promise<boolean> {
  console.log("\n🔄 Active Changes:");
  try {
    const specEngine = new LocalSpecEngine(projectRoot);
    const activeChange = await specEngine.getActiveChange();
    if (activeChange) {
      console.log(`  ✅ Active: ${activeChange.name} [${activeChange.status}]`);
    } else {
      console.log("  ℹ️  No active changes (normal when starting fresh)");
    }
  } catch {
    console.log("  ℹ️  OpenSpec not configured yet");
  }
  return true;
}

function checkWorkspace(projectRoot: string): boolean {
  console.log("\n🌐 Workspace:");
  const wsEngine = new WorkspaceEngine(projectRoot);
  const wsConfig = wsEngine.loadWorkspaceConfig();

  if (!wsConfig) {
    console.log("  ℹ️  Single-project mode (no workspace config)");
    return true;
  }

  console.log(`  ✅ Workspace mode: ${wsConfig.mode}`);
  console.log(`     Services: ${wsConfig.services?.length ?? 0}`);

  if (wsConfig.services && wsConfig.services.length > 0) {
    for (const svc of wsConfig.services) {
      const svcEntry = wsEngine.getServiceEntryPath(svc, wsConfig.platform);
      const entryExists = fs.existsSync(path.join(projectRoot, svcEntry));
      const icon = entryExists ? "✅" : "❌";
      console.log(`     ${icon} ${svc.name}: ${svcEntry}`);
    }
  }

  const globalContracts = wsConfig.globalContracts;
  if (globalContracts) {
    const fullPath = path.join(projectRoot, globalContracts);
    if (fs.existsSync(fullPath)) {
      console.log(`  ✅ Global contracts: ${globalContracts}`);
    } else {
      console.log(`  ⚠️  Global contracts missing: ${globalContracts}`);
    }
  }

  return true;
}
