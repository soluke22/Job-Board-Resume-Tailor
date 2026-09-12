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
private access. See [PRIVACY_BOUNDARY.md](PRIVACY_BOUNDARY.md) for precise rules.

server/db contains Neon/Drizzle schemas and migrations for auth and owner-scoped
workspace entities. workspaceRepository handles revisioned reads/writes/imports;
workspaceRoutes provides private data/import/export/audit APIs. privateFiles
uses owner metadata and Private Blob with authorized server-proxied attachments.
Phase 2 local persistence contracts are covered by synthetic Postgres-compatible
restart/rollback/isolation/fault tests; live Neon/Blob remain separate gates.
Explicit top-level collection saves replace only supplied collections. Retained
jobs preserve omitted attachments/histories; explicit histories replace that
owner's job history (empty lists clear). Imports merge selected IDs. Removed jobs
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
Refresh rehydrates from server. Session loss, expiry, logout or unavailable private
services clear private UI/cache; stale responses are rejected by generation.
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
routes are not certified by this assessment change.

## Acceptance versus target
Phase 1 audits authentication and public/private isolation. Deterministic tests
exercise production options, hooks, cookies, route denial and client request/cache
behavior. Live Google OAuth acceptance pending external configuration.
Live Neon/Blob durability, multi-connection transport/locking, deployment and authenticated browser
acceptance remain external/persistence gates; do not infer them from builds.

Future phases enforce generated claims, complete
live discovery/storage acceptance, and validate deployed Vercel runtime.
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
