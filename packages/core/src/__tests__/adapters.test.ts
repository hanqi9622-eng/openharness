import { describe, it, expect } from "vitest";
import { getAdapter, getAllAdapters } from "../adapter/index.js";

describe("AI Platform Adapters", () => {
  it("should return Claude Code adapter", () => {
    const adapter = getAdapter("claude-code");
    expect(adapter.platform).toBe("claude-code");
    expect(adapter.displayName).toBe("Claude Code");
    expect(adapter.getEntryFileName()).toBe("CLAUDE.md");
  });

  it("should return Cursor adapter", () => {
    const adapter = getAdapter("cursor");
    expect(adapter.platform).toBe("cursor");
    expect(adapter.getEntryFileName()).toBe(".cursorrules");
  });

  it("should return Copilot adapter", () => {
    const adapter = getAdapter("copilot");
    expect(adapter.platform).toBe("copilot");
    expect(adapter.getEntryFileName()).toBe(".github/copilot-instructions.md");
  });

  it("should return Cline adapter", () => {
    const adapter = getAdapter("cline");
    expect(adapter.platform).toBe("cline");
    expect(adapter.getEntryFileName()).toBe(".clinerules");
  });

  it("should return Codex adapter", () => {
    const adapter = getAdapter("codex");
    expect(adapter.platform).toBe("codex");
    expect(adapter.displayName).toBe("OpenAI Codex");
    expect(adapter.getEntryFileName()).toBe("AGENTS.md");
  });

  it("should return Trae adapter", () => {
    const adapter = getAdapter("trae");
    expect(adapter.platform).toBe("trae");
    expect(adapter.displayName).toBe("Trae");
    expect(adapter.getEntryFileName()).toBe(".trae/rules/project_rules.md");
  });

  it("should throw for unknown platform", () => {
    expect(() => getAdapter("unknown" as any)).toThrow("Unknown AI platform");
  });

  it("should list all adapters", () => {
    const adapters = getAllAdapters();
    expect(adapters.length).toBe(6);
  });

  it("should generate entry file content", () => {
    const adapter = getAdapter("claude-code");
    const result = adapter.getEntryFileContent("test-project", {
      implicitContractsDoc: "docs/architecture/implicit-contracts.md",
    });
    expect(result.content).toContain("test-project");
    expect(result.content).toContain("implicit-contracts.md");
  });

  it("should generate permissions config from protected paths", () => {
    const adapter = getAdapter("claude-code");
    const result = adapter.getPermissionsConfig([
      { pattern: "^application-prod\\.yml$", category: "Production", severity: "blocking" },
    ]);
    const parsed = JSON.parse(result.content);
    expect(parsed.permissions.deny.length).toBeGreaterThanOrEqual(1);
    expect(parsed.permissions.deny[0]).toContain("application-prod");
  });
});
