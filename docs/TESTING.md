# Testing

## Evidence owner review coverage
`node --import tsx --test tests/evidence-review.test.ts` exercises manual and
imported review states, enable/disable eligibility, every material claim-field
edit, explicit persisted approval and client hydration/reload, ordinary-save trust
forgery, owner isolation, strict HTTP bodies, inspected-content hashes, stale and
concurrent revisions, budget-free validation failures, and audit rollback.
React static rendering covers Needs review / Review & approve and Verified after
actual repository approval, using the existing node:test harness without a new
UI framework. Phase 4/5/6 persistence fixtures now explicitly approve evidence;
Phase 6 tests material-edit demotion and dependent assessment/resume/proof/answer
staleness. Real canonical auth inventory denies unauthenticated approval POST.
Production browser approval/reload acceptance remains a post-merge/deploy gate.

## Current state and commands
Use Node 24.x and npm ci with package-lock.json. Obsolete bun.lock was removed in Phase 8.
The committed node:test suite runs through tsx; PGlite tests workspace contracts.

- npm test: complete deterministic suite.
- node --import tsx --test tests/phase-4-assessment.test.ts: Phase 4 source,
  eligibility, provenance, retrieval, ID/adjacency validation, deterministic
  arithmetic/constraints, invalidation/cache, injection and real repository/handler
  certification. Mocked semantic responses do not certify live Gemini behavior.
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

## Phase 5 resume provenance coverage
Phase 4.1 focused calibration: node --import tsx --test tests/phase-4-1-calibration.test.ts.
Run with tests/phase-4-assessment.test.ts and tests/phase-5-resume.test.ts for
relationship coefficients, source centrality, project/production depth, duration,
central-gap dilution, archetype separation, APPLY FIRST and old-algorithm READY
invalidation. Synthetic semantic fixtures test server behavior, not live inference.

Focused: node --import tsx --test tests/phase-5-resume.test.ts (11 grouped tests).
Fixtures prove eligible/unknown/disabled/unverified/rejected/review/owner-isolated
IDs, duplicate normalization, exact statement support and negative-context handling;
unsupported metrics/technologies/leadership/ownership/years/impact/JD claims;
employer/title/period/project boundaries; multiple experiences in chosen order;
deterministic identity; strict generated schema and model-invented ID/injection
rejection; manual edit invalidation, punctuation rewrite revalidation and restore;
toggle support/empty-work fence; stale full evidence/master/profile/assessment basis.
Real PGlite owner route/repository fixtures prove generation, invalid regeneration
preservation, forged-validation downgrade, manual-before-validation checkpoints,
server final export rejection/selection, immutable history through saves/imports,
retention and import round-trip shape. Earlier auth gate inventories all new routes
and makes actual unauthorized HTTP requests. No live model or private data required.

Manual authenticated browser acceptance (external configuration gate): assess a
synthetic JD against approved synthetic records spanning two employers and a project;
plan/generate and inspect linked IDs, preserved names/titles/periods, summary/skills
status and history. Edit a bullet to add an unsupported percentage/technology/lead
verb; verify immediate manual-edit-unvalidated, blocked final export and failed
revalidation. Restore supported text and validate; disable all work and verify
export remains blocked. Disable supporting evidence or change JD/SearchProfile;
reassess and confirm the prior artifact stays STALE until newly generated.
Regenerate with synthetic injected model output; verify prior valid artifact remains.
Every final format and app print/PDF requires the same server READY check and exact
visible-content comparison. Inspect print preview: identity header selectable,
conventional sections, no hidden truncation; page count is measured only by preview,
not the character heuristic. Native Ctrl+P is labeled draft. Cover letters display
uncertified draft independently. Confirm final export history records chosen text/IDs.

Phase 5 deterministic provenance contract: verified locally.
Live Gemini resume-generation acceptance: pending external configuration.
GEMINI_API_KEY absent; only .env.example present. With a safe server key, run one
bounded synthetic-only structured generation request. Do not send real private
career data merely to test connectivity. Whole-statement certification intentionally
withholds arbitrary paraphrases; add separately reviewed concise evidence to support
alternate wording. Startup smoke: node --import tsx --test tests/phase-2-runtime.smoke.ts.

## Phase 6 deterministic coverage and live acceptance
Focused: `node --import tsx --test tests/phase-6-artifacts.test.ts` (14 grouped tests).
Synthetic current assessments, Phase 5 READY ledgers and real PGlite owner repository
routes cover 17 enabled claims across two batches; exact evidence/claim envelopes;
missing/unknown IDs, context/STAR/metric/leadership inflation; disabled claims; stale
resume/evidence/JD/assessment/profile; backend evidence without frontend hardcoding;
all calibrated priorities and SKIP override; explicit/unknown contact labels and
model minimization; six question categories, zero-model deterministic fields;
late-bank per-question retrieval; subjective motivation; original and explicit
stricter word/character limits; manual hash invalidation/browser forgery;
revision conflict and prior-artifact preservation on malformed output/model failure.
Reviewer-reported pregnancy/bipolar/age mixed technical questions route manual with
zero calls; sensitive evidence metadata is omitted and sensitive statement/technology
records withheld. The classifier is lexical, not exhaustive semantic classification.

Run Phase 4/4.1/5 regressions and the full release composition, standalone evidence
ID validator and startup smoke. Legacy persistence expectations separately assert
unchanged content plus DRAFT metadata; earlier ownership/replacement/rollback gates
remain. No live model or private data is needed for deterministic fixtures.

Manual authenticated browser gate: assess synthetic current JD/evidence, generate a
READY resume and proof with >8 claims; inspect all linked sources, supported context
and explicit missing STAR components. Change evidence/JD/profile/resume and verify
STALE and blocked app copy. Generate backend outreach with APPLY FIRST/gap/stretch,
verify distinct wording and no invented company excitement. Test SKIP with/without
explicit reason. Referral name/relationship should persist for the active job without
invented history. Ask location/degree/authorization, missing profile, technical,
motivation, compensation, disability/race/veteran/gender/health and attestation
questions; inspect categories and empty manual answers. Set actual limits and
verify explicit overlength errors preserve prior artifacts. Edit sources during a
request: local work must survive and adoption must require reload. Legacy cover
letters remain uncertified. READY never sends/submits or attests automatically.

Phase 6 deterministic artifact contracts: verified with synthetic structured fixtures.
Live Gemini proof/outreach/answer acceptance: pending external configuration.
GEMINI_API_KEY absent; only .env.example. Strict JSON schema/Zod, MEDIUM thinking,
30-second requests, no loose extraction or invented fallback. A configured server
key permits synthetic-only smoke; authenticated/deployed browser acceptance remains
an external gate. Whole-statement certification withholds general paraphrases and
STAR component assignment; manual artifact edits need fresh generation.

## Phase 7 outcome tracking coverage
Focused: node --import tsx --test tests/phase-7-outcomes.test.ts.
Synthetic scenarios cover historical screens/deeper stages then rejection, withdrawal,
offer and archive; skipped stages; zero/one application; duplicate events; explicit
legacy submission only; malformed/overflow quarantine; retries/no-ops/notes;
terminal/backward denial and append-only correction chains, including backdated
corrections preserving later rejection; legacy current-state correction/confirmation
without current-score backfill; application snapshots stable under current
reassessment, strong-fit rejection with unknown reason and no score mutation;
family/modifier/channel/source/fit-version/freshness/ATS cohorts and sample thresholds;
valid timestamp-pair medians and weekly event windows. Real PGlite transactions cover
owner isolation, concurrent duplicate transitions, immutable save/import lifecycle,
audit rollback and disk restart/new-owner backup round-trip. Real HTTP handlers deny
browser-supplied new lifecycle history and replacement transition fields, and expose
no-store owner analytics. Existing route inventory/session denial tests cover the new
routes. Prior legacy-history replacement assertions now require application history
preservation; collection/resume replacement, deletion and transaction rollback remain.

No SQL migration; npm run db:generate checks for schema drift and existing migration
upgrade tests remain. Run Phase 4/4.1/5/6 regressions, complete npm test, release:check,
standalone privacy/evidence validators, built startup smoke and git diff --check.
Manual authenticated browser gate (external configuration): use synthetic data,
mark APPLIED with date/channel/note, progress to screen/hiring manager/rejection,
archive and verify history/cohorts persist after reload. Repeat save/retry and inspect
one audit event. Correct an old mistaken stage and a mistaken correction; later
terminal state must remain. Reassess and confirm original fit snapshot/cohort persists.
Check stale resume/proof/outreach badges. Private empty data remains zero; demo is
labeled synthetic. No real employer rejection theories or private records in fixtures.
Live authenticated/deployed browser and Neon multi-connection transport remain
external gates; PGlite is serialized and cannot establish live locking behavior.

## Phase 8 runtime acceptance

Focused: `node --import tsx --test tests/phase-8-runtime.test.ts` on Node 24.x.
Adapter tests exercise finish/close/error/abort/throw/deadline, removed listeners,
exactly-once lazy pool cleanup, interleaved synthetic owners/data/errors and late
continuations, original nested method/query/path forwarding, no-config health/auth/
private JSON headers, malformed/oversized body, 2 MiB current private streaming,
provider stream failure and disconnect cancellation. Existing Phase 1/2 tests retain
auth/cookie/Origin/transactions/restart/compensation/reconcile/delete coverage.

After build: `npm run runtime:check` checks Node/npm/config, fallback precedence,
hashed client output, server environment names/available values and server-module
markers absent from client. It does not print values. `npm run release:check` runs
the complete prior gates; migration drift, standalone evidence validators and
`node --import tsx --test tests/phase-2-runtime.smoke.ts` remain separate checks.
This is local adapter/config acceptance, not Vercel CLI or live preview acceptance.
No CLI/project link or authorized nonproduction resources were available. Generated
Vercel Function count/routes/size, original rewrite path, large JSON response behavior,
deployed browser cookies, Neon transport/locking, Blob OIDC/CDN and Gemini remain
explicit external gates. Phase 8 is PARTIAL until unresolved platform behavior is
demonstrated; do not begin Phase 9 from a successful Vite build alone.

## Phase 9 security/release coverage

Focused: node --import tsx --test tests/phase-9-security.test.ts, plus Phase 5
sensitive-manual-claim and Phase 2 migration-preservation regressions. Tests cover
exact Origin adversaries, reserved/encoded SSRF destinations and mixed DNS,
atomic JSON complexity rejection, scanner positive/negative fixtures with no
matched-value logging, legacy gap410, malformed private JSON no-store, model
payload sensitivity and durable per-owner budget concurrency/rollback/outages.

release:check additionally runs runtime:check (Node24, one lock, Vercel config,
client environment/module/value scan). privacy:scan now scans tracked text and
fresh client/maps plus strong PEM/provider-key/DB-URL/bearer-JWT/.env accident
rules. New files must be reviewed/staged so tracked-file scan includes them.
Weak synthetic test credentials do not disable strong rules. These are bounded
regex/code-path checks, not comprehensive DLP or live provider certification.

Run and record full and omit-dev npm audit near release; do not force major fixes.
Optional peers can retain build tooling in omit-dev, so inspect runtime imports
and vulnerable API reachability. Critical/high production findings block;
moderates require fix or concrete documented disposition. The accepted old
Drizzle-loader esbuild chain does not invoke vulnerable serve; do not expose
old tooling dev servers. Registry unavailability is UNVERIFIED, never zero.
Reachable-history contact markers remain unresolved separately from green current
source checks. Full authenticated/deployed browser/header acceptance remains
PENDING_EXTERNAL_CONFIG; no local fixture claims live OAuth/Neon/Blob/Gemini.
