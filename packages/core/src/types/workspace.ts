export type WorkspaceMode = "single" | "monorepo" | "microservices";

export interface ServiceModule {
  name: string;
  path: string;
  language?: string;
  framework?: string;
  plugins?: string[];
  platform?: string;
}

export interface WorkspaceConfig {
  mode: WorkspaceMode;
  projectName: string;
  platform: string;
  plugins: string[];
  services?: ServiceModule[];
  globalContracts?: string;
  initializedAt: string;
  updatedAt: string;
}

export interface InheritedConfig {
  globalPlugins: string[];
  globalContracts: string[];
  globalProtectedPaths: { pattern: string; category: string; severity: string }[];
  servicePlugins: string[];
  serviceContracts: string[];
}

export interface ProjectAnalysis {
  mode: WorkspaceMode;
  services: ServiceModule[];
  languages: string[];
  frameworks: string[];
  buildTools: string[];
  packageManager: string;
}

export interface CrossServiceImpact {
  sourceService: string;
  targetServices: string[];
  impactType: "api-contract" | "shared-lib" | "database-schema" | "event-bus" | "config";
  description: string;
  severity: "blocking" | "warning";
}
