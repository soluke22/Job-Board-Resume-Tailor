# Testing

## Current state and commands
Use npm ci with package-lock.json. Historical bun.lock is not the install source.
The committed node:test suite runs through tsx; PGlite tests workspace contracts.

- npm test: complete deterministic suite.
- node --import tsx --test tests/auth-security.test.ts tests/phase-1-auth.test.ts tests/phase-1-client.test.ts: focused Phase 1 acceptance.
- npm run typecheck: TypeScript (lint is an alias).
- npm run build: Vite client and esbuild server; existing chunk warning is tracked.
- npm run harness:check: router/doc/skill/agent integrity and negative fixtures.
- npm run privacy:scan: bounded source/client artifact privacy triage; use
  --strict --require-build at release. Paths/rules only, no matched private text.
- node scripts/validate-evidence.mjs <synthetic-json-file>: evidence reference
  integrity; ID validation does not prove semantic candidate provenance.
- npm run release:check: typecheck, build, harness, strict public-artifact privacy
  scan and complete test suite. Never weaken validators to obtain a passing gate.
- git diff --check and scoped source/untracked diff review before committing.

## Phase 1 deterministic coverage
The inherited auth-security tests cover guard identity denial, mutation origin,
private file ownership/validation and isolated library sign-out.
phase-1-auth tests use the exact production Better Auth options/hooks with a
synthetic memory adapter, real signed cookies, real session lookup, owner session
creation, expiry/revocation, logout adapter failure, secure cookie attributes,
callback rejection and canonical OAuth redirect generation. Provider-profile
checks do not mock Google token verification into success; live Google is pending.
Installed Express route inventory plus actual HTTP requests cover every private
application/file API and workspace read/import/export/audit denial, no-store and
missing database behavior. Invalid expiry and auth-service errors fail closed.

phase-1-client tests run real API/storage modules with controlled transport delays
and synthetic browser storage/events. They cover memory-only records, distinct
blank private/synthetic demo sources, 401/403/503/network loss, stale workspace,
export/AI replies and old-network-failure races. Lifecycle wiring inspection is
supplementary, not proof of rendered authenticated OAuth browser behavior.

No credentials/private career records are used in these fixtures. Live Google
OAuth acceptance pending external configuration. External live credentials,
Google consent/registered callback, Neon schema and deployed Secure cookie behavior
must be tested separately. Phase 2 local contracts have dedicated tests below;
they do not claim live provider acceptance.

## Phase 2 persistence coverage

Focused: node --import tsx --test tests/workspace.test.ts tests/phase-2-workspace.test.ts
tests/phase-2-files.test.ts tests/phase-2-db-client.test.ts.
Startup smoke after build: node --import tsx --test tests/phase-2-runtime.smoke.ts.
The smoke is separate so normal npm test does not require a pre-existing build.

Disk PGlite closes/reopens with new DB/repository instances; saved workspace and
file metadata survive. Synthetic owners share IDs without collisions, cannot
replace/delete each other's records and retain owner-scoped audit/import/file data.
Real SQL triggers fail mid-save and after history deletion/audit insertion;
snapshot equality proves complete rollback. Tests cover explicit collection/history
replacement, all mapped job attachments, application fields, child removal,
duplicate/ambiguous IDs, nested import review/provenance and stale/concurrent revisions.
Real HTTP handlers cover 400/409/503; client conflict test retains memory state until
explicit reload while existing 503/network tests clear private access without demo substitution.

Real Postgres-compatible file metadata tests use synthetic Blob calls to exercise
put/DB insert/cleanup/read/delete outages, actual intent write failure, restart
reconciliation, retained late-put tombstones, delayed-upload fencing and ambiguous
commit acknowledgement. They cover size/type/encoding limits, safe proxy metadata/
headers, missing objects and partial streaming disconnect without JSON append.
DB boundary tests cover lazy public requests, local reuse, request isolation, pool
cleanup, per-DB auth and rejected late continuations. Startup smoke checks the built
Node shell/assets and Node serverless adapter without any private configuration.
Client application source is unchanged from Phase 1 rendered public-demo smoke.

Safe migration validation: npm run db:generate must report no drift; fresh migrations
apply via PGlite migrator, and committed SQL upgrade preserves existing workspace,
files and sessions. No remote migration is part of these tests.

PGlite uses a single serialized connection; it executes real PostgreSQL transaction/
locking SQL but cannot certify Neon multi-connection transport/disconnect behavior.
Synthetic Blob calls model documented semantics, not live CDN/abort/cleanup behavior.
Failed cleanup is durable and retryable, not guaranteed automatic/eventual without
an owner retry. Live Neon and Private Blob acceptance remain pending configuration.

## Phase 3 discovery/ATS coverage

Focused: node --import tsx --test tests/phase-3-discovery.test.ts.
Synthetic provider fixtures exercise Ashby listed/unlisted/feed absence/network,
Greenhouse exact success/404/error/board-only, Lever public exact success/404,
unsupported ATS and spoofed hostname detection. Dates preserve actual provider
publication/creation, keep update separate, and leave Recent/missing/future dates
unknown. Discovery exceptions/missing URL never fabricate content/status/scores.
Actual discovery executor tests preserve SDK grounding URLs/query strings, configured
preferences/custom queries, excluded identity/contact and measured request budget.

Shared server/client merge tests cover ATS IDs, canonical/tracking/Greenhouse alias
URLs, distinct requisitions, within-batch aliases, all application statuses,
first-seen/history/notes/resume/answer preservation and verified metadata refresh.
Runtime jobSchema accepts explicit unassessed records but rejects fake scores in
that state; existing assessment validation is retained. Generic page fixtures prove
200 is UNKNOWN, exact explicit closure is NOT_LISTED, and redirects/canonical links
require independent exact ATS verification. Safe-fetch fixtures cover schemes,
private/local/metadata/IPv6/DNS destinations, blocked redirects and redirect limit,
content types, streamed body cap, total DNS/transport timeout, and both Node lookup
callback shapes for DNS pinning. No live board or credentials are needed by CI.

Optional manual provider smoke (non-blocking, no applications/workspace writes):
choose a current public posting URL for each supported ATS; call the owner-protected
/api/verify-ats and inspect exact provider ID, status, canonical content/URL and date
provenance. Test board-only URL and unavailable ID separately; never assume a fixture
posting remains public. Official API reference review is separate from this runtime
smoke. With Gemini configured server-side, one /api/discover-jobs request using a
synthetic SearchProfile and queryBudget 1 should retain grounding sources and return
unassessed records; re-run with the resulting existingJobs to verify history matching.
Do not log secrets/private records, apply, or make CI depend on live results.

### Remaining live and later-phase gates
Security: live OAuth redirect/state/callback, Neon/Blob integration, multi-connection
transport/locking, deployed cookies/runtime; deployed network/egress acceptance.
ATS: manual live exact provider and Gemini grounding acceptance remain separate.
Evidence: unsupported/JD-derived/cross-owner claims, manual invalidation and export.
Integration: full authenticated browser lifecycle and truthful end-to-end workflows.
Use synthetic Gemini/ATS/provider fixtures by default. Never log secrets or raw
private workspace records. Build/static scanning cannot certify complete privacy.
Results and reviewer findings belong in the active plan and phase acceptance matrices.
