import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import type {
  AIPlatformAdapter,
  AIPlatform,
  AdapterConfigFile,
  AdapterEntryConfig,
  AdapterValidationResult,
} from "../types/index.js";
import type { ProtectedPath, HookDefinition } from "../types/index.js";

export abstract class BaseAdapter implements AIPlatformAdapter {
  abstract readonly platform: AIPlatform;
  abstract readonly displayName: string;

  abstract getEntryFileName(): string;
  abstract getEntryFileContent(projectName: string, config: AdapterEntryConfig): AdapterConfigFile;

  getSkillsDir(): string {
    return "skills";
  }

  getAgentsDir(): string {
    return "agents";
  }

  getStandardsDir(): string {
    return "docs/standards";
  }

  getPermissionsConfig(protectedPaths: ProtectedPath[]): AdapterConfigFile {
    const allow = this.getDefaultAllowList();
    const deny = [
      ...protectedPaths.map((p) => `Write(${p.pattern})`),
      ...this.getDefaultDenyPatterns(),
    ];

    return {
      path: this.getPermissionsPath(),
      content: JSON.stringify({ permissions: { allow, deny } }, null, 2),
    };
  }

  getHooksConfig(hooks: HookDefinition[], _projectRoot: string): AdapterConfigFile {
    const deduped = this.deduplicateHooks(hooks);
    const preWrite = deduped
      .filter((h) => h.event === "pre_write")
      .map((h) => this.formatHookCommand(h));
    const postWrite = deduped
      .filter((h) => h.event === "post_write")
      .map((h) => this.formatHookCommand(h));

    return {
      path: this.getHooksConfigPath(),
      content: JSON.stringify({ hooks: { pre_write: preWrite, post_write: postWrite } }, null, 2),
    };
  }

  buildPlatformConfig(protectedPaths: ProtectedPath[], hooks: HookDefinition[]): AdapterConfigFile[] {
    const configs: AdapterConfigFile[] = [];

    const permConfig = this.getPermissionsConfig(protectedPaths);
    if (permConfig.path && permConfig.content) {
      configs.push(permConfig);
    }

    const hooksConfig = this.getHooksConfig(hooks, "");
    if (hooksConfig.path && hooksConfig.content && hooksConfig.path !== permConfig.path) {
      configs.push(hooksConfig);
    }

    return configs;
  }

  async validateInstallation(projectRoot: string): Promise<AdapterValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const entryFile = path.join(projectRoot, this.getEntryFileName());
    if (!fs.existsSync(entryFile)) {
      errors.push(`Entry file not found: ${this.getEntryFileName()}`);
    }

    const permissionsFile = path.join(projectRoot, this.getPermissionsPath());
    if (!fs.existsSync(permissionsFile)) {
      warnings.push(`Permissions config not found: ${this.getPermissionsPath()}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  protected abstract getPermissionsPath(): string;
  protected abstract getHooksConfigPath(): string;

  protected getDefaultAllowList(): string[] {
    return [
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
      "Bash(go build*)",
      "Bash(go test*)",
      "Bash(cargo build*)",
      "Bash(cargo test*)",
      "Bash(python *)",
      "Bash(pip *)",
    ];
  }

  protected getDefaultDenyPatterns(): string[] {
    return [
      "Bash(rm -rf*)",
      "Bash(DROP TABLE*)",
      "Bash(DROP DATABASE*)",
      "Bash(git push*)",
      "Bash(git reset --hard*)",
      "Bash(sudo *)",
    ];
  }

  protected formatHookCommand(hook: HookDefinition): string {
    const isWin = process.platform === "win32";
    switch (hook.language) {
      case "python":
        return `${isWin ? "python" : "python3"} ${hook.path}`;
      case "bash":
        return `${isWin ? "sh" : "bash"} ${hook.path}`;
      case "node":
        return `node ${hook.path}`;
      default:
        return `${isWin ? "sh" : "bash"} ${hook.path}`;
    }
  }

  protected deduplicateHooks(hooks: HookDefinition[]): HookDefinition[] {
    const isWin = process.platform === "win32";
    const seen = new Map<string, HookDefinition>();

    for (const hook of hooks) {
      const baseName = hook.path.replace(/\.(sh|js|py)$/, "");
      const existing = seen.get(baseName);
      if (!existing) {
        seen.set(baseName, hook);
      } else if (isWin && hook.language === "node" && existing.language === "bash") {
        seen.set(baseName, hook);
      }
    }

    return Array.from(seen.values());
  }
}
