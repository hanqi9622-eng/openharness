export type ChangeStatus = "draft" | "proposed" | "approved" | "applying" | "reviewing" | "verifying" | "archived";

export interface Change {
  name: string;
  status: ChangeStatus;
  createdAt: string;
  updatedAt: string;
  artifacts: ChangeArtifacts;
}

export interface ChangeArtifacts {
  proposal?: string;
  specs?: string[];
  design?: string;
  tasks?: string;
}

export interface SpecEngine {
  listChanges(): Promise<Change[]>;
  getActiveChange(): Promise<Change | null>;
  createChange(name: string): Promise<Change>;
  updateChangeStatus(name: string, status: ChangeStatus): Promise<Change>;
  archiveChange(name: string): Promise<void>;
}

export interface OpenSpecConfig {
  profile: string;
  delivery: string;
  proposal: ProposalRules;
  specs: SpecRules;
  design: DesignRules;
  tasks: TaskRules;
  verify: VerifyRules;
  archive: ArchiveRules;
}

export interface ProposalRules {
  requireImpactSection: boolean;
  requireApiContractReference?: boolean;
  requireChangeType: boolean;
  draftByDefault: boolean;
}

export interface SpecRules {
  requireScenarioPerRequirement: boolean;
  scenarioFormat: string;
  mappableToAcceptanceCriteria: boolean;
  normativeLanguage: boolean;
}

export interface DesignRules {
  referenceDevMap: boolean;
  checkImplicitContracts: boolean;
  requireMigrationPlan?: boolean;
  requireApiVersioning?: boolean;
}

export interface TaskRules {
  requireStack: boolean;
  requireService?: boolean;
  requireExplicitDependencies: boolean;
  granularity: string;
  requireCrossServiceImpact?: boolean;
}

export interface VerifyRules {
  scope: string;
  excludeCodeReview: boolean;
  excludeArchitectureReview: boolean;
  checkImplicitContracts: boolean;
}

export interface ArchiveRules {
  syncSpecs: boolean;
  updateBoardJson: boolean;
  updateDevMap: boolean;
}
