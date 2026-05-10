# OpenHarness

> Make AI coding assistants follow your team's engineering rules.

[![CI](https://github.com/openharness/openharness/actions/workflows/ci.yml/badge.svg)](https://github.com/openharness/openharness/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://www.apache.org/licenses/LICENSE-2.0)
[![npm version](https://img.shields.io/badge/npm-v0.1.0--alpha-orange.svg)](https://www.npmjs.com/package/@openharness/core)

---

## Why OpenHarness?

AI coding assistants (Claude Code, Cursor, Copilot, Cline, Codex, Trae) are powerful — but in team projects they often:

- Modify production configs or secrets without knowing they're protected
- Skip architecture conventions the team has agreed on
- Commit code without running tests or review gates
- Violate "everyone knows but nobody wrote down" implicit contracts
- Work without a structured change lifecycle

**OpenHarness solves this** by wrapping AI assistants with a four-layer protection system: permissions → hooks → gates → reviews.

## Quick Start

```bash
npm install -g @openharness/core

# Initialize (auto-detects your AI platform)
cd your-project
openharness init --platform codex

# Auto-analyze project and generate documentation
openharness init --platform codex --auto-analyze

# Verify everything is wired up
openharness doctor
```

That's it. OpenHarness generates the AI entry file, deploys hooks, skills, and agents, and configures permissions — all tailored to your AI platform and tech stack.

## What Gets Generated

### Single Project

```
your-project/
├── AGENTS.md                       # AI navigation entry
├── openharness.yaml                # Project state (platform, plugins)
├── openspec-config.yaml            # Change lifecycle rules
├── openspec/
│   ├── specs/                      # System capability specs
│   └── changes/                    # Active change proposals
├── hooks/                          # Pre/post write hooks
└── docs/
    └── architecture/
        ├── index.md                # Your architecture overview
        └── implicit-contracts.md   # Your project's pitfalls
```

### Multi-Service Workspace (Microservices / Monorepo)

When OpenHarness detects multiple services, it automatically generates a layered workspace:

```
company-platform/
├── AGENTS.md                               # Root AI navigation entry
├── openharness.yaml                        # Project state
├── openharness.workspace.yaml              # Workspace config (services, mode)
├── openspec-config.yaml                    # Change lifecycle rules
├── docs/
│   └── architecture/
│       ├── index.md                        # Overall architecture
│       ├── global-contracts.md             # Cross-service rules (inherited by all)
│       └── auto-analysis.md                # Auto-detected project analysis (--auto-analyze)
├── user-service/
│   ├── AGENTS.md                           # Service-level entry (inherits global contracts)
│   ├── pom.xml
│   └── docs/architecture/
│       └── implicit-contracts.md           # Service-specific pitfalls
├── order-service/
│   ├── AGENTS.md
│   └── docs/architecture/
│       └── implicit-contracts.md
└── payment-service/
    ├── AGENTS.md
    └── ...
```

**Configuration inheritance**: Each service inherits global contracts and can define its own local rules.

## CLI Commands

```
openharness init -p codex            # Initialize project
openharness init -p codex --auto-analyze  # Auto-analyze and generate docs
openharness doctor                   # Verify installation
openharness gate                     # Run gate checks
openharness gate --parallel          # Run checks in parallel
openharness gate --fail-fast         # Stop on first failure
openharness add openharness-spring   # Add a plugin

openharness list plugins             # List loaded plugins
openharness list changes             # List OpenSpec changes
openharness list skills              # List available skills

openharness change create add-auth   # Create a change
openharness change status            # Show active change
openharness change advance add-auth applying  # Advance status
openharness change archive add-auth  # Archive completed change
```

## Four-Layer Protection

```
┌─────────────────────────────────────────────────────────────┐
│                     Protection Layers                        │
│                                                             │
│  Layer 1: Permissions                                       │
│  ├── Deny writes to production configs, secrets, migrations │
│  └── Defined in AI platform native config                   │
│                                                             │
│  Layer 2: Hooks (real execution)                            │
│  ├── Pre-write: guard protected paths (built-in)            │
│  ├── Pre-write: enforce active change context (built-in)     │
│  ├── Pre/Post-write: run external hook scripts              │
│  └── Supports Python, Bash, Node.js hooks                   │
│                                                             │
│  Layer 3: Gates (auto-triggered via Git pre-commit)         │
│  ├── Full pre-commit validation                             │
│  ├── Compile, test, lint, spec consistency                  │
│  ├── Sequential / parallel / fail-fast execution modes      │
│  └── Cross-platform (Windows / macOS / Linux)               │
│                                                             │
│  Layer 4: Reviews                                           │
│  ├── Architecture review (Spring layering, etc.)            │
│  ├── SQL risk review (injection, N+1, batch safety)         │
│  └── Change summary (auto-generated before human review)    │
└─────────────────────────────────────────────────────────────┘
```

## Unified Workflow

OpenHarness uses a single continuous workflow — plan first, then execute:

```
explore → propose → human approval → apply
                                          ↓
                         ANALYSIS → DESIGN → IMPLEMENTATION → REVIEW → TESTING → COMPLETE
```

1. **Planning Phase**: Explore the codebase, propose changes, get human approval, then apply
2. **Execution Phase**: Structured engineering steps from analysis through to completion

No mode switching required — planning flows naturally into execution.

## OpenSpec Change Lifecycle

OpenHarness uses OpenSpec to manage a structured change lifecycle with state machine protection:

```
draft → proposed ⇄ approved → applying → reviewing ⇄ verifying → archived
```

- **State machine enforcement**: Invalid transitions are rejected (e.g. cannot jump from `draft` to `archived`)
- **Artifact tracking**: Auto-discovers `proposal.md`, `design.md`, `tasks.md`, and spec files
- **Git pre-commit integration**: Gate checks run automatically before every commit

## Implicit Contracts

Every project has unwritten conventions. OpenHarness makes them explicit:

1. Document in `implicit-contracts.md` with severity (Critical / Important / Note)
2. AI checks against them during propose and review
3. When violated, harden into a gate check or hook rule

In multi-service workspaces, contracts exist at two levels:
- **Global contracts** (`docs/architecture/global-contracts.md`) — cross-service rules inherited by all services
- **Service contracts** (`<service>/docs/architecture/implicit-contracts.md`) — service-specific pitfalls

## Auto-Analyze

Use `--auto-analyze` to let OpenHarness scan your project and pre-fill documentation:

```bash
openharness init --platform codex --auto-analyze
```

This automatically:
- Detects project mode (single / monorepo / microservices)
- Identifies all services, their languages and frameworks
- Generates architecture docs with detected technologies
- Suggests implicit contracts based on your tech stack (e.g., Spring Boot JPA rules, TypeScript strict mode)
- Detects cross-service dependencies and reports them

## Supported AI Platforms

| Platform | Entry File | Permissions Output | Hook Integration |
|----------|-----------|-------------------|-----------------|
| Claude Code | `CLAUDE.md` + `.claude/` | `.claude/settings.local.json` | ✅ Native hooks |
| Cursor | `.cursorrules` | `.cursor/rules/openharness.mdc` | ✅ MDC rules |
| GitHub Copilot | `.github/copilot-instructions.md` | `.github/copilot-openharness.md` | ✅ Embedded rules |
| Cline | `.clinerules` | `.clinerules-openharness` | ✅ Embedded rules |
| OpenAI Codex | `AGENTS.md` | `.codex/config.toml` | ✅ TOML config |
| Trae | `.trae/rules/project_rules.md` | `.trae/rules/*.md` | ✅ Markdown rules |

## Plugins

### Built-in

| Plugin | Stack | What It Adds |
|--------|-------|-------------|
| `openharness-spring` | Spring Boot + JPA | 3 skills, 1 agent, 4 gates, 4 hooks, 2 standards |

### Create Your Own

A plugin is one YAML manifest + Markdown files:

```yaml
# openharness.plugin.yaml
name: openharness-react
version: 1.0.0
description: "React + TypeScript governance plugin"
author: your-team
license: Apache-2.0

provides:
  skills:
    - id: react-component-review
      path: skills/react-component-review/SKILL.md
      triggers: ["*.tsx", "*.jsx"]
  gates:
    - id: react-typecheck
      command: "npx tsc --noEmit"
  codeFilePatterns:
    - ".*\\.tsx?$"
    - ".*\\.jsx?$"

constrains:
  languages: ["typescript", "javascript"]
  frameworks: ["react"]
```

Drop it in `packages/` and it's automatically discovered. Plugin manifests are validated at load time with runtime schema checking.

## Multi-Service Architecture Support

OpenHarness supports three project modes:

| Mode | Detection | Description |
|------|-----------|-------------|
| `single` | Single service in root | Standard single-application project |
| `monorepo` | `pnpm-workspace.yaml`, `lerna.json`, `nx.json`, `turbo.json` | Multiple services, same tech stack |
| `microservices` | Multiple languages/frameworks detected | Multiple services, different tech stacks |

### How It Works

1. **Auto-detection**: Scans project directories for build files (`pom.xml`, `package.json`, `go.mod`, `Cargo.toml`, etc.)
2. **Service identification**: Detects language, framework, and build tool for each service (10+ frameworks)
3. **Layered configuration**: Global contracts are inherited by all services; each service can define local rules
4. **Cross-service impact analysis**: Detects dependencies between services (shared libraries, API contracts, database schemas)

## Project Structure

```
openharness/
├── packages/
│   ├── core/                         # Framework engine
│   │   ├── src/
│   │   │   ├── engine/               # Core engines
│   │   │   │   ├── plugin-registry.ts      # Plugin discovery, loading, validation
│   │   │   │   ├── gate-engine.ts          # Gate execution (seq/parallel/fail-fast)
│   │   │   │   ├── hook-engine.ts          # Hook orchestration (built-in + external)
│   │   │   │   ├── external-hook-executor.ts  # Python/Bash/Node hook execution
│   │   │   │   ├── spec-engine.ts          # OpenSpec change lifecycle
│   │   │   │   ├── change-state-machine.ts # Change state machine validation
│   │   │   │   ├── workspace-config.ts     # Workspace configuration engine
│   │   │   │   ├── workspace-engine.ts     # Project detection & cross-service deps
│   │   │   │   └── validators.ts           # Zod runtime schema validation
│   │   │   ├── adapter/              # AI platform adapters (6 platforms)
│   │   │   ├── cli/                  # CLI commands (init, doctor, gate, add, list, change)
│   │   │   └── types/               # TypeScript type contracts
│   │   └── bin/openharness.js        # CLI entry point
│   │
│   └── plugin-spring/                # Spring Boot plugin pack
│       ├── openharness.plugin.yaml
│       ├── skills/                   # Architecture review, SQL risk review
│       ├── agents/                   # Independent code reviewer
│       ├── hooks/                    # Write guard, change context guard
│       ├── gates/                    # Maven compile, test, Flyway validate
│       └── standards/                # Database & testing standards
│
├── examples/                         # Demo projects
├── .github/workflows/                # CI + Release
└── eslint.config.mjs                 # Shared lint config
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 5.7 (ES2022, Node16 modules) |
| Runtime | Node.js >= 20.0.0 |
| Package Manager | pnpm >= 9.0.0 |
| Build | tsc (strict mode) |
| Test | Vitest 3.x |
| Lint | ESLint 9 (flat config) |
| Schema Validation | Zod |
| CLI Framework | Commander.js |
| Configuration | YAML (yaml library) |

## Contributing

Areas we'd love help with:

- **New plugins**: React, Python/Django, Go, Rust
- **Core improvements**: hook sandboxing, remote plugin discovery, gate result persistence
- **Docs**: tutorials, examples, i18n

PRs welcome.

## License

[Apache License 2.0](LICENSE) © OpenHarness Team
