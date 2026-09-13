---
name: release-validation
description: Audit final diff, security/privacy, stale code and release readiness without unrelated implementation.
---
# release-validation
## Load
Read docs/PRODUCT_INVARIANTS.md, docs/TESTING.md and active execution plan from repository root; resolve docs links relative to root, not this directory.
## Relevant modules
Scoped diff, affected routes/data paths, scripts and generated client assets (confirm existence in the active checkout).
## Procedure and invariants
Run deterministic checks, inspect new files and baseline failures, review privacy and concrete boundary defects with security-reviewer. Missing coverage prevents an unqualified readiness verdict.
## Validation
npm run release:check; available focused suites; git diff --check and production smoke/manual acceptance per TESTING.
## Completion
Evidence-backed release verdict with failed/unavailable checks and blockers; no unrelated features.
