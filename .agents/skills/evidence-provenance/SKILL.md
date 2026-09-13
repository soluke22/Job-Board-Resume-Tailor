---
name: evidence-provenance
description: Validate claims, evidence retrieval, gap answers, manual edits, proof packs, outreach and application answers.
---
# evidence-provenance
## Load
Read docs/EVIDENCE_MODEL.md from repository root; resolve docs links relative to root, not this directory.
## Relevant modules
server.ts claim routes, src/types/index.ts, AppContext, EvidenceBankView, ResumeEditorView and affected artifact view (confirm existence in the active checkout).
## Procedure and invariants
Resolve approved enabled owner evidence before generation. A JD never proves candidate experience. Validate metrics/verbs/dates/technology and retain IDs. Manual edits invalidate approval. Imported flags cannot self-verify.
## Validation
npm run typecheck; npm run build; node scripts/validate-evidence.mjs <synthetic-json-file>; semantic/manual-edit scenarios in TESTING. ID integrity alone does not prove support.
## Completion
Unknown/rejected/disabled IDs rejected; unsupported claims blocked and edits await revalidation.
