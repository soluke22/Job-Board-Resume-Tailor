---
name: verify-release
description: Independently verify a scoped release against product invariants and security acceptance requirements.
---

# verify-release

## Load
Read [PRODUCT_INVARIANTS.md](../../docs/PRODUCT_INVARIANTS.md) and [TESTING.md](../../docs/TESTING.md).

## Workflow and completion
Inspect the implementation diff and affected paths; run build, type checks, available tests and security acceptance checks, scan private data and review the diff. Distinguish passed, failed and unavailable checks. Report actionable correctness, security, maintainability or requirement findings with locations. Do not implement unrelated features. Completion is an evidence-backed release verdict with unresolved blockers, not an assumption that missing tests passed.

## Validation
Use the exact commands and release procedure in TESTING.md; inspect new files as well as tracked diffs.
