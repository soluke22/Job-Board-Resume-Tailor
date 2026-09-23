# Architecture

## Current State — committed dev implementation
React 19/Vite renders through src/main.tsx and src/App.tsx. AppContext coordinates
candidate setup, discovery, evidence, tailoring and application workflows.
Express/Gemini remains the application server; server/local.ts serves Vite in
development and dist/client in production. api/index.ts is the Vercel adapter.
Build emits dist/client and dist/server.mjs; Next.js remains conditional.

Better Auth in server/auth.ts installs before JSON middleware and implements
Google OAuth, verified configured owner authorization and database sessions.
Workspace routes inherit an owner router; private files use direct owner guards;
remaining /api operations inherit the server owner boundary. Health is public.
Cookie sessions are HttpOnly/Lax, Secure over HTTPS, one day with hourly renewal,
without cookie caching. Missing configuration or session/storage outages deny
private access; direct non-auth application-request failures do not substitute
for an auth verdict or clear a still-verifiable session. See
[PRIVACY_BOUNDARY.md](PRIVACY_BOUNDARY.md) for precise rules.

server/db contains Neon/Drizzle schemas and migrations for auth and owner-scoped
workspace entities. workspaceRepository handles revisioned reads/writes/imports;
workspaceRoutes provides private data/import/export/audit APIs. privateFiles
uses owner metadata and Private Blob with authorized server-proxied attachments.
Phase 2 local persistence contracts are covered by synthetic Postgres-compatible
restart/rollback/isolation/fault tests; live Neon/Blob remain separate gates.
Explicit top-level collection saves replace only supplied collections. Retained
jobs preserve omitted attachments/histories; explicit legacy resume histories replace
that owner's resume history (empty lists clear). Application lifecycle fields and
history now preserve the stored originals through ordinary saves/imports of matching
job IDs; changes use the owner-scoped atomic Phase 7 transition operation. Phase 5 certified resume versions
are immutable and retained through saves/imports until job removal. Imports merge selected IDs. Removed jobs
delete owner-scoped children transactionally. Upserted scalar fields replace prior
values, including omitted optional SQL scalars. Ambiguous parent IDs reject atomically.
Imports merge selected IDs and reset imported candidate provenance/review, not ATS status.
Private Blob uploads first commit a durable recovery intent, then lock it during
put/metadata finalization. Owner-triggered reconciliation fences delayed uploads,
protects saved metadata and retains abandoned tombstones for late-put retry.
Blob/DB operations are compensated, not distributed-atomic; see DEPLOYMENT.md.
Local Node pools reuse until shutdown; Node serverless pools/auth instances are
request-local and closed boundaries reject late continuations without reopening.

Private data flow: server session -> authorized workspace read -> in-memory
browser cache -> AppContext -> API -> guarded Express -> database/Gemini/Blob.
Workspace changes synchronize through revisioned APIs. src/services/storage.ts
keeps private data/auth UI metadata in memory; public demo uses separate synthetic
fixtures and public localStorage keys. legacyImport previews explicit local
imports for owner confirmation. Empty private state uses blank setup defaults.
Refresh rehydrates from server. Session loss, expiry, logout, or unavailable
session/auth verification clear private UI/cache; direct non-auth service failures
preserve a verified session. Stale responses are rejected by generation.
Public demo rendering remains independent of auth/database configuration.

## AI and ATS boundaries
Gemini initializes server-side from GEMINI_API_KEY. Discovery uses search
through Gemini; analysis, evidence matches, plans, resumes, letters, evaluations,
proof packs and outreach run through owner-protected API routes. AI outputs remain
untrusted; route authorization does not establish semantic candidate provenance.
JSON parsing and redaction are not sufficient evidence validation.
Phase 3 discovery uses server/discovery.ts and exact public ATS adapters, preserving
search provenance separately from canonical content, independent source/local dates,
uncertain freshness and unassessed jobs. Shared src/utils/jobIdentity.ts merges
current/history matches without replacing application lifecycle/attachments.
server/safeFetch.ts bounds and DNS-pins arbitrary URL retrieval; generic reachability
does not establish listing state. See [JOB_SEARCH_PIPELINE.md](JOB_SEARCH_PIPELINE.md).
Evidence contracts and gaps belong in [EVIDENCE_MODEL.md](EVIDENCE_MODEL.md).
Phase 4 server/assessment.ts plus assessmentRoutes.ts use owner repository context,
strict shared structured schemas, bounded retrieval and deterministic arithmetic.
Assessments persist under revision guards; fingerprinted certification/cache and
stale-history reads replace the old process-local analysis cache. Later artifact
routes require their own artifact-specific validation.
Phase 5 resumeProvenance/resumeRoutes certify exact supported claim ledgers and final
export. Phase 6 artifactProvenance/artifactRoutes reuse current assessment and evidence
eligibility, require READY resume ledgers for proofs, and persist fingerprinted
downstream artifacts under workspace revisions. Existing JSON-backed proof/outreach/
contact/application records need no migration. Repository reads recheck stale bases;
ordinary saves/imports cannot forge approval. Profile/manual question routing bypasses
Gemini; model context excludes private contact/history and unrelated evidence metadata.

## Acceptance versus target
Phase 8 pins npm/package-lock and Node 24.x, with Vite static `dist/client` plus
one request-local `api/index.ts` Node Express Function. Response finish/close/error,
request abort and a 290s deadline settle once and close the lazy Neon boundary;
late continuations cannot reopen it. Concurrent synthetic adapter tests isolate
owners/data/errors and DB objects, including streamed disconnects. Blob SDK 2.8.0
already resolves provider-managed OIDC plus BLOB_STORE_ID implicitly; static tokens
are the outside-Vercel fallback. Static canonical auth origin is retained; ephemeral
previews stay public, private staging needs a separate stable origin/resources.
Actual Vercel rewrite path preservation, generated Function output/bundle size and
large-response acceptance remain unresolved external runtime gates (Phase 8 PARTIAL).
See [Phase 8 acceptance](exec-plans/active/phase-8-acceptance.md) and deployment runbook.

Phase 1 audits authentication and public/private isolation. Deterministic tests
exercise production options, hooks, cookies, route denial and client request/cache
behavior. Live Google OAuth acceptance pending external configuration.
Live Neon/Blob durability, multi-connection transport/locking, deployment and authenticated browser
acceptance remain external/persistence gates; do not infer them from builds.

Remaining phases complete live discovery/storage/model acceptance and validate
deployed Vercel runtime. Deterministic claim/artifact contracts do not establish live
semantic inference, browser behavior or runtime-provider acceptance.
Server operations must derive identity from verified sessions and authorize every
record/file. Client state is a view/cache, never authentication or storage authority.
Private failures must remain explicit, never synthetic replacements.
Release audit precedes dev-to-main PR, merged-main AI Studio verification, then
final Vercel production. See [DEPLOYMENT.md](DEPLOYMENT.md).

## Related contracts and history
[PRODUCT_INVARIANTS.md](PRODUCT_INVARIANTS.md) owns product behavior;
[PRIVACY_BOUNDARY.md](PRIVACY_BOUNDARY.md) owns security rules;
[active execution plan](exec-plans/active/productionization.md) owns current gates.
The old process-token/localStorage/no-database architecture describes the
pre-reconciliation baseline. Integrations committed in 41a04f8 are current code,
not pending working-tree changes or proof of completed persistence acceptance.

## Phase 7 lifecycle authority
server/applicationLifecycle.ts validates transitions and application snapshots;
src/types/application.ts is the runtime/TS contract and legacy normalizer.
workspaceRepository.transition serializes on the owner workspace row and atomically
commits application/event/audit/revision. JSON-backed application/events require no
SQL migration. Correction chains preserve original records, and effective timestamps
reconcile current state. src/utils/outcomeAnalytics.ts is deterministic and shared by
private server analytics and views; no analytics DB or model request is introduced.
Historical snapshots remain separate from current source-sensitive assessments.
See JOB_SEARCH_PIPELINE.md for counting, provenance, limits and correction semantics.
