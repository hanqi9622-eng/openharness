import type { AIPlatform, AIPlatformAdapter } from "../types/index.js";
import { ClaudeCodeAdapter } from "./claude-code.js";
import { CursorAdapter } from "./cursor.js";
import { CopilotAdapter } from "./copilot.js";
import { ClineAdapter } from "./cline.js";
import { CodexAdapter } from "./codex.js";
import { TraeAdapter } from "./trae.js";

class AdapterRegistryInstance {
  private adapters: Map<string, AIPlatformAdapter> = new Map();
  private defaultsRegistered = false;

  register(adapter: AIPlatformAdapter): void {
    this.adapters.set(adapter.platform, adapter);
  }

  get(platform: string): AIPlatformAdapter {
    this.ensureDefaults();
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new Error(`Unknown AI platform: ${platform}. Available: ${Array.from(this.adapters.keys()).join(", ")}`);
    }
    return adapter;
  }

  getAll(): AIPlatformAdapter[] {
    this.ensureDefaults();
    return Array.from(this.adapters.values());
  }

  has(platform: string): boolean {
    this.ensureDefaults();
    return this.adapters.has(platform);
  }

  private ensureDefaults(): void {
    if (this.defaultsRegistered) return;
    this.defaultsRegistered = true;
    this.register(new ClaudeCodeAdapter());
    this.register(new CursorAdapter());
    this.register(new CopilotAdapter());
    this.register(new ClineAdapter());
    this.register(new CodexAdapter());
    this.register(new TraeAdapter());
  }
}

export const AdapterRegistry = new AdapterRegistryInstance();

export function getAdapter(platform: AIPlatform): AIPlatformAdapter {
  return AdapterRegistry.get(platform);
}

export function getAllAdapters(): AIPlatformAdapter[] {
  return AdapterRegistry.getAll();
}

export { ClaudeCodeAdapter, CursorAdapter, CopilotAdapter, ClineAdapter, CodexAdapter, TraeAdapter };
