import type { HookContext, HookResult, HookExecutor } from "../types/index.js";
import type { PluginRegistry } from "./plugin-registry.js";
import { ExternalHookExecutor } from "./external-hook-executor.js";

function safeRegex(pattern: string): RegExp | null {
  try {
    const regex = new RegExp(pattern);
    const testStr = "a".repeat(100);
    const start = Date.now();
    regex.test(testStr);
    if (Date.now() - start > 50) return null;
    return regex;
  } catch {
    return null;
  }
}

class PathGuardHook implements HookExecutor {
  id = "path-guard";
  event = "pre_write" as const;
  private compiledPatterns: { regex: RegExp; pattern: string; category: string; severity: string }[];

  constructor(protectedPatterns: { pattern: string; category: string; severity: string }[]) {
    this.compiledPatterns = [];
    for (const p of protectedPatterns) {
      const regex = safeRegex(p.pattern);
      if (regex) {
        this.compiledPatterns.push({ regex, ...p });
      }
    }
  }

  async execute(context: HookContext): Promise<HookResult> {
    const normalized = context.filePath.replace(/\\/g, "/");
    for (const p of this.compiledPatterns) {
      if (p.regex.test(normalized)) {
        return {
          allowed: false,
          reason: `Protected path [${p.category}]: ${context.filePath} matches pattern: ${p.pattern}`,
        };
      }
    }
    return { allowed: true };
  }
}

class ChangeContextHook implements HookExecutor {
  id = "change-context-guard";
  event = "pre_write" as const;
  private compiledPatterns: RegExp[];

  constructor(codeFilePatterns: string[]) {
    this.compiledPatterns = [];
    for (const p of codeFilePatterns) {
      const regex = safeRegex(p);
      if (regex) {
        this.compiledPatterns.push(regex);
      }
    }
  }

  async execute(context: HookContext): Promise<HookResult> {
    const normalized = context.filePath.replace(/\\/g, "/");
    const isCode = this.compiledPatterns.some((r) => r.test(normalized));
    if (!isCode) {
      return { allowed: true };
    }

    if (context.activeChange) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `No active OpenSpec change context. Code file "${context.filePath}" requires an active change to be modified.`,
    };
  }
}

export class HookEngine {
  private executors: HookExecutor[] = [];

  constructor(private registry: PluginRegistry, private hooksDir?: string) {}

  async initialize(): Promise<void> {
    const protectedPaths = this.registry.getAllProtectedPaths();
    if (protectedPaths.length > 0) {
      this.executors.push(new PathGuardHook(protectedPaths));
    }

    const codePatterns = this.registry.getAllCodeFilePatterns();
    if (codePatterns.length > 0) {
      this.executors.push(new ChangeContextHook(codePatterns));
    }

    const pluginHooks = this.registry.getAllHooks();
    if (pluginHooks.length > 0 && this.hooksDir) {
      for (const hookDef of pluginHooks) {
        this.executors.push(new ExternalHookExecutor(hookDef, this.hooksDir));
      }
    }
  }

  async runPreWrite(context: HookContext): Promise<HookResult> {
    for (const executor of this.executors.filter((e) => e.event === "pre_write")) {
      const result = await executor.execute(context);
      if (!result.allowed) {
        return result;
      }
    }
    return { allowed: true };
  }

  async runPostWrite(context: HookContext): Promise<HookResult[]> {
    const results: HookResult[] = [];
    for (const executor of this.executors.filter((e) => e.event === "post_write")) {
      const result = await executor.execute(context);
      results.push(result);
    }
    return results;
  }

  async runPreCommit(context: HookContext): Promise<HookResult> {
    for (const executor of this.executors.filter((e) => e.event === "pre_commit")) {
      const result = await executor.execute(context);
      if (!result.allowed) {
        return result;
      }
    }
    return { allowed: true };
  }

  async runPostCommit(context: HookContext): Promise<HookResult[]> {
    const results: HookResult[] = [];
    for (const executor of this.executors.filter((e) => e.event === "post_commit")) {
      const result = await executor.execute(context);
      results.push(result);
    }
    return results;
  }

  getExecutors(): HookExecutor[] {
    return this.executors;
  }
}
