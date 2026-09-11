---
name: evidence-grounding
description: Retrieve approved evidence and validate claim provenance for resumes, interviews, proof packs, outreach and application answers.
---

# evidence-grounding

## Load
Read [EVIDENCE_MODEL.md](../../docs/EVIDENCE_MODEL.md).

## Workflow and completion
Trace the affected evidence or claim contract in src/types/index.ts through server.ts generation/validation and AppContext. Inspect EvidenceBankView, ResumeEditorView or the affected artifact view only as needed. Resolve approved owner-scoped evidence before generation; validate every resulting claim and retain its linkage through edits/export. JD content never becomes candidate evidence. Completion requires unsupported claims and unresolved/rejected IDs to be blocked.

## Validation
Run npm run lint, npm run build and focused evidence/manual-edit scenarios from [TESTING.md](../../docs/TESTING.md).
