---
name: job-discovery
description: Correct search discovery, ATS verification, freshness, deduplication and fit ranking.
---

# job-discovery

## Load
Read [JOB_SEARCH_PIPELINE.md](../../docs/JOB_SEARCH_PIPELINE.md).

## Workflow and completion
Trace server.ts discovery/verify routes into server/atsAdapters.ts and server/searchEngine.ts; consult shared types and DiscoverView only as needed. Fix the relevant pipeline stage with synthetic provider fixtures covering success, absence and uncertainty. Search results remain unverified; reachable pages do not prove active postings; unknown dates are not today; responsibilities require source support. Completion includes preserved source identity and uncertainty through the returned record.

## Validation
Run npm run lint, npm run build and focused pipeline scenarios from [TESTING.md](../../docs/TESTING.md).
