---
name: repo-context
description: Locate relevant modules and dependencies for unfamiliar repository tasks without implementing changes.
---

# repo-context

## Load
Read [AGENTS.md](../../AGENTS.md) and [ARCHITECTURE.md](../../docs/ARCHITECTURE.md).

## Workflow and completion
Start with the system map; search only the feature's entry point and immediate dependencies. Inspect package.json for commands and relevant existing tests. Report relevant modules, domain docs/skill, commands and risks concisely. Do not implement or redesign; completion is a usable bounded handoff.

## Validation
No build needed for read-only orientation; confirm paths and commands exist.
