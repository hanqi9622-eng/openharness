export interface HookContext {
  event: "pre_write" | "post_write" | "pre_commit" | "post_commit";
  filePath: string;
  content?: string;
  projectRoot: string;
  activeChange?: string;
}

export interface HookResult {
  allowed: boolean;
  reason?: string;
  modified?: boolean;
  modifiedContent?: string;
}

export interface HookExecutor {
  id: string;
  event: "pre_write" | "post_write" | "pre_commit" | "post_commit";
  execute(context: HookContext): Promise<HookResult>;
}
