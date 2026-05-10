export type {
  PluginManifest,
  PluginProvides,
  PluginConstrains,
  SkillDefinition,
  AgentDefinition,
  GateDefinition,
  HookDefinition,
  StandardDefinition,
  ProtectedPath,
  ReviewDimension,
  ReviewCheck,
} from "./plugin.js";

export type {
  AIPlatform,
  AIPlatformAdapter,
  AdapterConfigFile,
  AdapterEntryConfig,
  AdapterValidationResult,
} from "./adapter.js";

export type {
  GateStatus,
  GateCheck,
  GateResult,
  GateConfig,
} from "./gate.js";

export type {
  HookContext,
  HookResult,
  HookExecutor,
} from "./hook.js";

export type {
  Change,
  ChangeStatus,
  ChangeArtifacts,
  SpecEngine,
  OpenSpecConfig,
  ProposalRules,
  SpecRules,
  DesignRules,
  TaskRules,
  VerifyRules,
  ArchiveRules,
} from "./spec.js";

export type {
  WorkspaceMode,
  WorkspaceConfig,
  ServiceModule,
  InheritedConfig,
  ProjectAnalysis,
  CrossServiceImpact,
} from "./workspace.js";
