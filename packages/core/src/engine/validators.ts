import { z } from "zod";

export const ProtectedPathSchema = z.object({
  pattern: z.string().min(1),
  category: z.string().min(1),
  severity: z.enum(["blocking", "warning"]),
});

export const SkillDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  description: z.string().optional(),
  path: z.string().min(1),
  triggers: z.array(z.string()).optional(),
});

export const AgentDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  description: z.string().optional(),
  path: z.string().min(1),
  triggers: z.array(z.string()).optional(),
});

export const GateDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  description: z.string().optional(),
  command: z.string().min(1),
  optional: z.boolean().optional(),
  platform: z.enum(["unix", "windows", "all"]).optional(),
});

export const HookDefinitionSchema = z.object({
  id: z.string().min(1),
  path: z.string().min(1),
  event: z.enum(["pre_write", "post_write", "pre_commit", "post_commit"]),
  language: z.enum(["python", "bash", "node"]).optional(),
});

export const StandardDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  path: z.string().min(1),
  category: z.string().optional(),
});

export const PluginProvidesSchema = z.object({
  skills: z.array(SkillDefinitionSchema).optional(),
  agents: z.array(AgentDefinitionSchema).optional(),
  gates: z.array(GateDefinitionSchema).optional(),
  hooks: z.array(HookDefinitionSchema).optional(),
  standards: z.array(StandardDefinitionSchema).optional(),
  protectedPaths: z.array(ProtectedPathSchema).optional(),
  codeFilePatterns: z.array(z.string()).optional(),
  reviewDimensions: z.array(z.any()).optional(),
});

export const PluginConstrainsSchema = z.object({
  languages: z.array(z.string()).optional(),
  frameworks: z.array(z.string()).optional(),
  aiPlatforms: z.array(z.string()).optional(),
  requires: z.array(z.string()).optional(),
});

export const PluginManifestSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().min(1),
  author: z.string().min(1),
  license: z.string().min(1),
  homepage: z.string().url().optional(),
  repository: z.string().optional(),
  provides: PluginProvidesSchema,
  constrains: PluginConstrainsSchema,
});

export const OpenSpecConfigSchema = z.object({
  profile: z.string(),
  delivery: z.string(),
  proposal: z.object({
    requireImpactSection: z.boolean(),
    requireApiContractReference: z.boolean().optional(),
    requireChangeType: z.boolean(),
    draftByDefault: z.boolean(),
  }),
  specs: z.object({
    requireScenarioPerRequirement: z.boolean(),
    scenarioFormat: z.string(),
    mappableToAcceptanceCriteria: z.boolean(),
    normativeLanguage: z.boolean(),
  }),
  design: z.object({
    referenceDevMap: z.boolean(),
    checkImplicitContracts: z.boolean(),
    requireMigrationPlan: z.boolean().optional(),
    requireApiVersioning: z.boolean().optional(),
  }),
  tasks: z.object({
    requireStack: z.boolean(),
    requireService: z.boolean().optional(),
    requireExplicitDependencies: z.boolean(),
    granularity: z.string(),
    requireCrossServiceImpact: z.boolean().optional(),
  }),
  verify: z.object({
    scope: z.string(),
    excludeCodeReview: z.boolean(),
    excludeArchitectureReview: z.boolean(),
    checkImplicitContracts: z.boolean(),
  }),
  archive: z.object({
    syncSpecs: z.boolean(),
    updateBoardJson: z.boolean(),
    updateDevMap: z.boolean(),
  }),
});

export function validatePluginManifest(data: unknown) {
  return PluginManifestSchema.safeParse(data);
}

export function validateOpenSpecConfig(data: unknown) {
  return OpenSpecConfigSchema.safeParse(data);
}
