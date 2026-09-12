---
name: ats-verification
description: Correct ATS canonical URLs, posting status, freshness and deduplication.
---
# ats-verification
## Load
Read docs/JOB_SEARCH_PIPELINE.md from repository root; resolve docs links relative to root, not this directory.
## Relevant modules
server.ts, server/atsAdapters.ts, server/searchEngine.ts, src/types/index.ts (confirm existence in the active checkout).
## Procedure and invariants
Trace discovery → exact posting → returned record. HTTP 200 alone is not LISTED; snippets are discovery data rather than canonical JD truth. Unknown publication date is not today. Deduplicate by posting identity within and across batches.
## Validation
npm run typecheck; npm run build; synthetic exact/removed/board-only/error/date/dedupe fixtures described in TESTING. ATS suite is a future requirement, not an existing passing command.
## Completion
Source identity and uncertainty survive the pipeline; authoritative removal is represented truthfully.
