---
name: repo-context
description: Locate only relevant subsystem files, dependencies and tests without implementing.
---
# repo-context
## Load
Read AGENTS.md and docs/ARCHITECTURE.md plus active execution plan from repository root; resolve docs links relative to root, not this directory.
## Relevant modules
src/context/AppContext.tsx, server.ts, services and the requested entry point (confirm existence in the active checkout).
## Procedure and invariants
Search the entry point and immediate dependencies. Return files, relevant skill, dependencies, tests and risks. Stay read-only; do not redesign architecture.
## Validation
Confirm referenced paths and package commands exist; no build required for read-only mapping.
## Completion
A concise bounded handoff that avoids unrelated repository exploration.
