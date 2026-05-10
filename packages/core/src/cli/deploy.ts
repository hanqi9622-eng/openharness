import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import type { AIPlatform, AIPlatformAdapter, ProtectedPath, HookDefinition } from "../types/index.js";
import type { PluginManifest } from "../types/index.js";
import type { PluginRegistry } from "../engine/plugin-registry.js";
import { writeFile, copyFile, createDirectory, createTemplateIfNotExists } from "./utils.js";
import {
  generateAutoArchitecture,
  generateArchitectureTemplate,
  generateImplicitContractsTemplate,
  generateOpenSpecConfig,
} from "./templates.js";
import type { ProjectAnalysis } from "../types/index.js";
import { WorkspaceEngine } from "../engine/workspace-config.js";

export async function deployPermissionsAndHooks(
  projectRoot: string,
  adapter: AIPlatformAdapter,
  protectedPaths: ProtectedPath[],
  hooks: HookDefinition[]
): Promise<void> {
  const configs = adapter.buildPlatformConfig(protectedPaths, hooks);

  for (const config of configs) {
    writeFile(path.join(projectRoot, config.path), config.content);
    console.log(`  ✅ Created ${config.path}`);
  }
}

export function deployHooksFiles(
  projectRoot: string,
  registry: PluginRegistry,
  plugins: PluginManifest[],
  hooks: HookDefinition[],
  skipHooks?: boolean
): void {
  if (skipHooks || hooks.length === 0) return;
  const hooksTargetDir = path.join(projectRoot, "hooks");
  const isWin = process.platform === "win32";
  const deployed = new Set<string>();

  for (const hook of hooks) {
    const pluginDir = registry.getPluginDir(
      plugins.find((p) => p.provides.hooks?.some((h) => h.id === hook.id))?.name ?? ""
    );
    if (!pluginDir) continue;

    const basename = path.basename(hook.path);
    const baseNameNoExt = basename.replace(/\.(sh|js|py)$/, "");

    if (deployed.has(baseNameNoExt)) continue;

    if (isWin && hook.language === "bash") {
      const jsPath = path.join(pluginDir, hook.path.replace(/\.sh$/, ".js"));
      if (fs.existsSync(jsPath)) {
        const jsBasename = path.basename(jsPath);
        copyFile(jsPath, path.join(hooksTargetDir, jsBasename));
        console.log(`  ✅ Deployed hook: hooks/${jsBasename} (Windows)`);
        deployed.add(baseNameNoExt);
        continue;
      }
    }

    const srcPath = path.join(pluginDir, hook.path);
    if (fs.existsSync(srcPath)) {
      copyFile(srcPath, path.join(hooksTargetDir, basename));
      console.log(`  ✅ Deployed hook: hooks/${basename}`);
      deployed.add(baseNameNoExt);
    }
  }
}

export function deploySkillsAndAgents(
  projectRoot: string,
  adapter: AIPlatformAdapter,
  registry: PluginRegistry,
  plugins: PluginManifest[]
): void {
  const skills = registry.getAllSkills();
  const agents = registry.getAllAgents();
  if (skills.length === 0 && agents.length === 0) return;

  const skillsDir = path.join(projectRoot, adapter.getSkillsDir());
  const agentsDir = path.join(projectRoot, adapter.getAgentsDir());

  for (const skill of skills) {
    const pluginDir = registry.getPluginDir(
      plugins.find((p) => p.provides.skills?.some((s) => s.id === skill.id))?.name ?? ""
    );
    if (pluginDir) {
      const srcPath = path.join(pluginDir, skill.path);
      const skillName = path.basename(path.dirname(skill.path));
      const destDir = path.join(skillsDir, skillName);
      if (fs.existsSync(srcPath)) {
        copyFile(srcPath, path.join(destDir, "SKILL.md"));
        console.log(`  ✅ Deployed skill: ${adapter.getSkillsDir()}/${skillName}/`);
      }
    }
  }

  for (const agent of agents) {
    const pluginDir = registry.getPluginDir(
      plugins.find((p) => p.provides.agents?.some((a) => a.id === agent.id))?.name ?? ""
    );
    if (pluginDir) {
      const srcPath = path.join(pluginDir, agent.path);
      if (fs.existsSync(srcPath)) {
        copyFile(srcPath, path.join(agentsDir, path.basename(agent.path)));
        console.log(`  ✅ Deployed agent: ${adapter.getAgentsDir()}/${path.basename(agent.path)}`);
      }
    }
  }
}

export function createCommonStructure(
  projectRoot: string,
  projectName: string,
  options: { skipStandards?: boolean; autoAnalyze?: boolean },
  analysis: ProjectAnalysis
): void {
  createDirectory(path.join(projectRoot, "openspec", "changes", "archive"));
  createDirectory(path.join(projectRoot, "openspec", "specs"));
  console.log("  ✅ Created openspec/ directory structure");

  createDirectory(path.join(projectRoot, "docs", "architecture"));
  createDirectory(path.join(projectRoot, "docs", "product"));
  createDirectory(path.join(projectRoot, "docs", "standards"));
  console.log("  ✅ Created docs/ directory structure");

  createDirectory(path.join(projectRoot, "harness"));
  console.log("  ✅ Created harness/ directory structure");

  if (!options.skipStandards) {
    if (options.autoAnalyze) {
      const wsEngine = new WorkspaceEngine(projectRoot);
      createTemplateIfNotExists(
        path.join(projectRoot, "docs", "architecture", "index.md"),
        generateAutoArchitecture(projectName, analysis)
      );
      createTemplateIfNotExists(
        path.join(projectRoot, "docs", "architecture", "implicit-contracts.md"),
        wsEngine.generateAutoAnalysisDoc(analysis) + "\n\n" + generateImplicitContractsTemplate()
      );
      console.log("  ✅ Created auto-analyzed doc templates");
    } else {
      createTemplateIfNotExists(
        path.join(projectRoot, "docs", "architecture", "implicit-contracts.md"),
        generateImplicitContractsTemplate()
      );
      createTemplateIfNotExists(
        path.join(projectRoot, "docs", "architecture", "index.md"),
        generateArchitectureTemplate(projectName)
      );
      console.log("  ✅ Created doc templates");
    }
  }

  createTemplateIfNotExists(
    path.join(projectRoot, "openspec-config.yaml"),
    generateOpenSpecConfig()
  );
  console.log("  ✅ Created openspec-config.yaml");
}

export function installGitPreCommitHook(projectRoot: string): void {
  const gitDir = path.join(projectRoot, ".git");
  if (!fs.existsSync(gitDir)) {
    return;
  }

  const hooksDir = path.join(gitDir, "hooks");
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  const preCommitPath = path.join(hooksDir, "pre-commit");
  const hookContent = `#!/bin/sh
# OpenHarness pre-commit hook — auto-installed by openharness init
# Runs gate checks before every commit

npx openharness gate
exit_code=$?

if [ $exit_code -ne 0 ]; then
  echo ""
  echo "❌ OpenHarness gate check FAILED. Commit aborted."
  echo "   Run 'openharness gate' for details."
  echo ""
  exit 1
fi
`;

  if (fs.existsSync(preCommitPath)) {
    const existing = fs.readFileSync(preCommitPath, "utf-8");
    if (existing.includes("openharness gate")) {
      return;
    }
  }

  fs.writeFileSync(preCommitPath, hookContent, "utf-8");

  try {
    const { chmodSync } = fs;
    chmodSync(preCommitPath, 0o755);
  } catch {
    // Windows may not support chmod, that's OK
  }

  console.log("  ✅ Installed Git pre-commit hook (.git/hooks/pre-commit)");
}

export function detectPlatform(projectRoot: string): AIPlatform | undefined {
  if (fs.existsSync(path.join(projectRoot, ".claude"))) return "claude-code";
  if (fs.existsSync(path.join(projectRoot, "CLAUDE.md"))) return "claude-code";
  if (fs.existsSync(path.join(projectRoot, ".cursorrules"))) return "cursor";
  if (fs.existsSync(path.join(projectRoot, ".cursor"))) return "cursor";
  if (fs.existsSync(path.join(projectRoot, ".github", "copilot-instructions.md"))) return "copilot";
  if (fs.existsSync(path.join(projectRoot, ".clinerules"))) return "cline";
  if (fs.existsSync(path.join(projectRoot, "AGENTS.md"))) return "codex";
  if (fs.existsSync(path.join(projectRoot, ".codex"))) return "codex";
  if (fs.existsSync(path.join(projectRoot, ".trae"))) return "trae";
  return undefined;
}
