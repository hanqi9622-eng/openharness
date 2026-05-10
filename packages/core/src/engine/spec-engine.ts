import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { Change, ChangeStatus, ChangeArtifacts, SpecEngine, OpenSpecConfig } from "../types/index.js";
import { validateOpenSpecConfig } from "./validators.js";
import { isValidTransition, getValidNextStatuses } from "./change-state-machine.js";

export class LocalSpecEngine implements SpecEngine {
  private config: OpenSpecConfig | null = null;

  constructor(private projectRoot: string) {}

  async listChanges(): Promise<Change[]> {
    const changesDir = this.getChangesDir();
    if (!fs.existsSync(changesDir)) {
      return [];
    }

    const entries = fs.readdirSync(changesDir, { withFileTypes: true });
    const changes: Change[] = [];

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== "archive") {
        const change = this.loadChange(path.join(changesDir, entry.name));
        if (change) {
          changes.push(change);
        }
      }
    }

    return changes;
  }

  async getActiveChange(): Promise<Change | null> {
    const changes = await this.listChanges();
    const activeStatuses: ChangeStatus[] = ["proposed", "approved", "applying", "reviewing", "verifying"];
    return changes.find((c) => activeStatuses.includes(c.status)) ?? null;
  }

  async createChange(name: string): Promise<Change> {
    const changeDir = path.join(this.getChangesDir(), name);
    fs.mkdirSync(changeDir, { recursive: true });

    const metadata = {
      name,
      status: "draft" as ChangeStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(
      path.join(changeDir, ".openspec.yaml"),
      YAML.stringify(metadata),
      "utf-8"
    );

    return {
      ...metadata,
      artifacts: {},
    };
  }

  async updateChangeStatus(name: string, status: ChangeStatus): Promise<Change> {
    const changeDir = path.join(this.getChangesDir(), name);
    const metaPath = path.join(changeDir, ".openspec.yaml");

    if (!fs.existsSync(metaPath)) {
      throw new Error(`Change not found: ${name}`);
    }

    const metadata = YAML.parse(fs.readFileSync(metaPath, "utf-8"));
    const currentStatus = metadata.status as ChangeStatus;

    if (!isValidTransition(currentStatus, status)) {
      throw new Error(
        `Invalid state transition: ${currentStatus} → ${status}. ` +
        `Valid transitions from "${currentStatus}": ${this.getValidTransitions(currentStatus).join(", ")}`
      );
    }

    metadata.status = status;
    metadata.updatedAt = new Date().toISOString();

    fs.writeFileSync(metaPath, YAML.stringify(metadata), "utf-8");

    return {
      ...metadata,
      artifacts: this.discoverArtifacts(changeDir),
    };
  }

  private getValidTransitions(current: ChangeStatus): ChangeStatus[] {
    return getValidNextStatuses(current);
  }

  async archiveChange(name: string): Promise<void> {
    const changesDir = this.getChangesDir();
    const changeDir = path.join(changesDir, name);
    const archiveDir = path.join(changesDir, "archive");

    if (!fs.existsSync(changeDir)) {
      throw new Error(`Change not found: ${name}`);
    }

    fs.mkdirSync(archiveDir, { recursive: true });
    fs.renameSync(changeDir, path.join(archiveDir, name));
  }

  async loadConfig(): Promise<OpenSpecConfig> {
    if (this.config) return this.config;

    const configPath = path.join(this.projectRoot, "openspec-config.yaml");
    if (!fs.existsSync(configPath)) {
      throw new Error(`OpenSpec config not found: ${configPath}`);
    }

    this.config = YAML.parse(fs.readFileSync(configPath, "utf-8")) as OpenSpecConfig;

    const validation = validateOpenSpecConfig(this.config);
    if (!validation.success) {
      const errors = validation.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new Error(`Invalid OpenSpec config: ${errors}`);
    }

    return this.config!;
  }

  private getChangesDir(): string {
    return path.join(this.projectRoot, "openspec", "changes");
  }

  private loadChange(changeDir: string): Change | null {
    const metaPath = path.join(changeDir, ".openspec.yaml");
    if (!fs.existsSync(metaPath)) {
      return null;
    }

    const metadata = YAML.parse(fs.readFileSync(metaPath, "utf-8"));
    return {
      ...metadata,
      artifacts: this.discoverArtifacts(changeDir),
    };
  }

  private discoverArtifacts(changeDir: string): ChangeArtifacts {
    const artifacts: ChangeArtifacts = {};

    if (fs.existsSync(path.join(changeDir, "proposal.md"))) {
      artifacts.proposal = "proposal.md";
    }
    if (fs.existsSync(path.join(changeDir, "design.md"))) {
      artifacts.design = "design.md";
    }
    if (fs.existsSync(path.join(changeDir, "tasks.md"))) {
      artifacts.tasks = "tasks.md";
    }

    const specsDir = path.join(changeDir, "specs");
    if (fs.existsSync(specsDir)) {
      artifacts.specs = this.discoverSpecFiles(specsDir);
    }

    return artifacts;
  }

  private discoverSpecFiles(dir: string): string[] {
    const files: string[] = [];
    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const specPath = path.join(dir, entry.name, "spec.md");
        if (fs.existsSync(specPath)) {
          files.push(path.join("specs", entry.name, "spec.md"));
        }
      }
    }
    return files;
  }
}
