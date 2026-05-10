import type { ProtectedPath, HookDefinition } from "./plugin.js";

export type AIPlatform = "claude-code" | "cursor" | "copilot" | "cline" | "codex" | "trae" | "windsurf" | "aider";

export interface AIPlatformAdapter {
  readonly platform: AIPlatform;
  readonly displayName: string;

  getPermissionsConfig(protectedPaths: ProtectedPath[]): AdapterConfigFile;
  getHooksConfig(hooks: HookDefinition[], projectRoot: string): AdapterConfigFile;
  getEntryFileContent(projectName: string, config: AdapterEntryConfig): AdapterConfigFile;
  getEntryFileName(): string;
  getSkillsDir(): string;
  getAgentsDir(): string;
  getStandardsDir(): string;

  buildPlatformConfig(protectedPaths: ProtectedPath[], hooks: HookDefinition[]): AdapterConfigFile[];

  validateInstallation(projectRoot: string): Promise<AdapterValidationResult>;
}

export interface AdapterConfigFile {
  path: string;
  content: string;
}

export interface AdapterEntryConfig {
  architectureDoc?: string;
  implicitContractsDoc?: string;
  productDoc?: string;
  standardsDocs?: string[];
  harnessDoc?: string;
  devMapDoc?: string;
  gateScript?: string;
}

export interface AdapterValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
