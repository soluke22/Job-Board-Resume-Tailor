---
name: job-ranking
description: Assess deterministic blockers, qualifications, evidence coverage, constraints and priority.
---
# job-ranking
## Load
Read docs/JOB_SEARCH_PIPELINE.md and docs/EVIDENCE_MODEL.md from repository root; resolve docs links relative to root, not this directory.
## Relevant modules
server/searchEngine.ts, server.ts, shared types, analysis UI (confirm existence in the active checkout).
## Procedure and invariants
Evaluate source-backed requirements against explicit constraints and approved evidence. Label direct/adjacent support and gaps. Role family alone cannot determine fit score; application priority cannot inflate qualification.
## Validation
npm run typecheck; npm run build; focused synthetic blocker/ranking scenarios in TESTING; add executable coverage with implementation.
## Completion
Explainable fit and priority with missing information and hard blockers preserved.
