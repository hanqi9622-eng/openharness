export type GateStatus = "pass" | "fail" | "warn" | "skip";

export interface GateCheck {
  id: string;
  name: string;
  command: string;
  optional: boolean;
  status: GateStatus;
  output?: string;
  duration?: number;
}

export interface GateResult {
  passed: boolean;
  total: number;
  passedCount: number;
  failedCount: number;
  warnedCount: number;
  skippedCount: number;
  checks: GateCheck[];
  timestamp: string;
  duration: number;
}

export interface GateConfig {
  skipChecks?: string[];
  failFast?: boolean;
  parallel?: boolean;
  timeout?: number;
}
