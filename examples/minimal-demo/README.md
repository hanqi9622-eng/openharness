# Minimal Demo — OpenHarness Example

> A technology-agnostic project showing the minimal OpenHarness setup.

## Setup

```bash
# From this directory
npx openharness init --platform cursor
npx openharness doctor
```

## What This Example Shows

1. **No plugins** — Just the core framework with implicit contracts tracking
2. **Cursor adapter** — Generates `.cursorrules` instead of `CLAUDE.md`
3. **Change lifecycle** — OpenSpec propose → apply → verify → archive workflow
4. **No gates** — Minimal setup without compile/test gates

This is useful for teams that want the change governance without tech-stack-specific checks.

## Key Files After Init

```
minimal-demo/
├── .cursorrules                       # AI navigation entry (Cursor format)
├── openspec-config.yaml               # Change lifecycle config
├── openspec/
│   ├── specs/
│   └── changes/
└── docs/
    └── architecture/
        └── implicit-contracts.md      # Your project's pitfalls
```
