export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  homepage?: string;
  repository?: string;

  provides: PluginProvides;

  constrains: PluginConstrains;
}

export interface PluginProvides {
  skills?: SkillDefinition[];
  agents?: AgentDefinition[];
  gates?: GateDefinition[];
  hooks?: HookDefinition[];
  standards?: StandardDefinition[];
  protectedPaths?: ProtectedPath[];
  codeFilePatterns?: string[];
  reviewDimensions?: ReviewDimension[];
}

export interface SkillDefinition {
  id: string;
  name?: string;
  description?: string;
  path: string;
  triggers?: string[];
}

export interface AgentDefinition {
  id: string;
  name?: string;
  description?: string;
  path: string;
  triggers?: string[];
}

export interface GateDefinition {
  id: string;
  name?: string;
  description?: string;
  command: string;
  optional?: boolean;
  platform?: "unix" | "windows" | "all";
}

export interface HookDefinition {
  id: string;
  path: string;
  event: "pre_write" | "post_write" | "pre_commit" | "post_commit";
  language?: "python" | "bash" | "node";
}

export interface StandardDefinition {
  id: string;
  name?: string;
  path: string;
  category?: string;
}

export interface ProtectedPath {
  pattern: string;
  category: string;
  severity: "blocking" | "warning";
}

export interface ReviewDimension {
  id: string;
  name: string;
  description: string;
  checks: ReviewCheck[];
}

export interface ReviewCheck {
  id: string;
  description: string;
  passCondition: string;
  failMessage: string;
  severity: "blocking" | "major" | "minor";
}

export interface PluginConstrains {
  languages?: string[];
  frameworks?: string[];
  aiPlatforms?: string[];
  requires?: string[];
}
