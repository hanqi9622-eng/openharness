# Spring Boot Demo — OpenHarness Example

> A minimal Spring Boot project configured with OpenHarness.

## Setup

```bash
# From this directory
npx openharness init --platform claude-code
npx openharness add openharness-spring
npx openharness doctor
```

## What This Example Shows

1. **Entry file** (`CLAUDE.md`) — AI reads this first to understand project structure
2. **Protected paths** — AI cannot modify `application-prod.yml`, migrations, or secrets
3. **Change context guard** — AI cannot write code without an active OpenSpec change
4. **Gate checks** — Maven compile + test must pass before commit
5. **Implicit contracts** — Document your project's hidden pitfalls

## Key Files After Init

```
spring-boot-demo/
├── CLAUDE.md                          # AI navigation entry
├── .claude/settings.local.json        # Permissions + hooks
├── openspec-config.yaml               # Change lifecycle config
├── openspec/
│   ├── specs/
│   └── changes/
├── docs/
│   ├── architecture/
│   │   ├── index.md
│   │   └── implicit-contracts.md      # Your project's pitfalls
│   └── standards/
│       ├── testing.md
│       └── database.md
└── harness/
    ├── gate.sh
    └── dev-map.md
```

## Workflow Example

```bash
# 1. Start a change
# AI reads CLAUDE.md → explores openspec/ → creates a change

# 2. Propose
# AI creates proposal.md with Impact section → human reviews

# 3. Apply
# AI implements code → hooks auto-compile → gates validate

# 4. Review
# AI runs spring-architecture-review, sql-risk-review → generates report

# 5. Verify & Archive
# AI checks consistency → archives change → spec library updated
```
