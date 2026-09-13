# Deployment

## Phase 8 runtime runbook (2026-09-13)

Retain React/Vite static `dist/client` plus one Node Express Function at
`api/index.ts`. No Next.js/Edge migration. Local shell `dist/server.mjs` is not
the Function artifact. Use Node **24.x** (certified locally on 24.19.0), npm and
`package-lock.json`; `npm ci` is the explicit Vercel install command. The obsolete
Bun lock is removed, recoverable in Git history. Dependency versions are unchanged.
[Vercel Node selection](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
and [dependency installation](https://vercel.com/docs/functions/runtimes/node-js)
support this contract; broad `>=22` did not pin a deployed major.

### Project settings and routing

Project root: repository root; framework: Vite; build: `npm run build`; output:
`dist/client`; install: `npm ci`; Node: 24.x; Fluid Compute enabled/verified in
the intended project. `vercel.json` preserves one Function with 300-second duration.
API rewrite `/api/:path* -> /api` precedes SPA fallback. Bare `/api`, nested API
paths and `/assets` are excluded from SPA fallback. Do not route API errors to HTML.
The adapter passes methods/URLs unchanged to Express; deterministic tests prove
this only for supplied original URLs. **Actual Vercel rewrite path preservation,
generated route table and single-Function output remain mandatory external gates.**
Do not claim local Express is equivalent to the platform rewrite engine.
[Express support](https://vercel.com/docs/frameworks/backend/express),
[rewrites](https://vercel.com/docs/routing/rewrites),
[configuration reference](https://vercel.com/docs/project-configuration).

The 300-second budget is retained rather than increased: AI calls each have 30s
timeouts; proofs use sequential 12-claim batches, so total runtime can exceed a
single call. Blob calls have 15s abort budgets; DB connect 10s. The adapter's 290s
deadline bounds response waiting, leaving cleanup margin; it does not certify
completion of arbitrary-size proofs or cancel remote operations. Deadline destroys
the transport (no JSON race with an uncancelled Express 4 route); clients treat this
as a network failure and clear private access. Pool close waits at most 5s; a stuck
close rejects generically, without proving remote cancellation. Late DB work
fails closed. Large proof runtime acceptance remains pending; no partial READY
record is manufactured. Finish/close/abort/error/deadline remove listeners and
close one request boundary exactly once, including streams. ALS isolates DBs;
auth WeakMap keys are request DB objects, not a shared session/owner cache.

[Function limits](https://vercel.com/docs/functions/limitations): 4.5 MB request/
response, 250 MB uncompressed Node bundle; duration includes streaming. JSON limit
is 3 MiB; 2 MiB base64 uploads occupy about 2.80 MB plus bounded metadata. Private
downloads remain 2 MiB. Large workspace/export JSON can exceed the provider limit:
maximum-size live response acceptance is **unverified**, not a promise of unlimited
export. Record actual Function bundle size from Vercel output before release.

### Environment matrix (all application configuration server-only)

| Variable | Requirement | Local | Ordinary preview | Stable private staging | Production |
| --- | --- | --- | --- | --- | --- |
| DATABASE_URL | Private auth/storage | Nonproduction DB | Absent | Staging Neon branch | Production Neon only |
| BETTER_AUTH_SECRET | Private auth, >=32 trimmed chars | Local secret | Absent | Separate staging secret | Production-only secret |
| BETTER_AUTH_URL | Private auth canonical origin | localhost HTTP outside production | Absent | Exact stable HTTPS origin | Exact canonical HTTPS origin |
| GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET | Private Google OAuth | Local callback credentials | Absent | Staging registered callback | Production registered callback |
| OWNER_EMAIL | Private verified owner | Authorized test owner | Absent | Authorized staging owner | Actual owner; never public |
| GEMINI_API_KEY | Private AI only | Optional test key | Absent | Optional synthetic-only smoke key | Production server key |
| BLOB_STORE_ID | Preferred deployed Blob OIDC config | Optional | Absent | Isolated PRIVATE staging store | PRIVATE production store |
| VERCEL_OIDC_TOKEN | Provider-managed Blob credential | Do not copy | No private store access | Vercel manages/refreshes | Vercel manages/refreshes |
| BLOB_READ_WRITE_TOKEN | Outside-Vercel/static fallback | Isolated test-store token | Absent | Omit with working OIDC | Omit with working OIDC |
| NODE_ENV / VERCEL_ENV | Runtime/platform | Local shell mode | Provider Preview | Provider Preview | Provider Production |
| PORT / DISABLE_HMR | Optional local shell/tooling | Local only | Not private config | Not private config | Not private config |

Never use `VITE_*` secrets. Resource IDs still need environment separation. Scope
sensitive Preview variables to the explicit stable staging branch/domain, not all
feature previews. Do not copy production DB/store/secrets into preview. Ordinary
ephemeral previews exercise public synthetic demo with private auth unavailable.
Public navigation and `/api/health` must not contact Neon/Blob/Gemini/Google.

### Private resources, OAuth and migrations

Provision/select resources only with explicit authorization: nonproduction Neon,
PRIVATE Blob store and Google OAuth configuration. First record Neon region and
Vercel Function region as a pair; choose a nearby supported Function region only
after the actual database region is known. No region is guessed in source.
Keep request-local Neon WebSocket Pool/Drizzle for interactive transactions;
local persistent shell reuses its pool until shutdown. No filesystem persistence.
[Neon lifecycle](https://neon.com/docs/serverless/serverless-driver).

Review `migrations/` and `npm run db:generate` (no drift), confirm target/backup and
authorize the nonproduction `DATABASE_URL`, then `npm run db:migrate` against that
target only. Check existing synthetic records survive and test read/write/conflict/
reload/transaction behavior. Never run remote migration as an implicit build step.
Do not use `db:studio` casually against production. Production migration is later.

Set one static auth origin; registered Google redirect:
`<BETTER_AUTH_URL>/api/auth/callback/google`.
[Better Auth Google](https://better-auth.com/docs/authentication/google).
No arbitrary Host/forwarded-host trust, wildcard `*.vercel.app`, OAuth proxy or
global Express trust-proxy change is introduced. Exact mutation Origin stays enforced.
HTTPS sessions are Secure/HttpOnly/SameSite=Lax, host-only, one day expiry/hourly
renewal, no cookie cache or cross-subdomain sharing. Live callback/session refresh/
expiry/revoking logout/non-owner denial remain browser gates, not fixture results.
[Cookie behavior](https://better-auth.com/docs/concepts/cookies).

Installed `@vercel/blob` **2.8.0** source and declarations support automatic OIDC
resolution through `@vercel/oidc`, `BLOB_STORE_ID` and provider-managed credentials.
Application calls intentionally pass neither explicit token nor oidcToken, retaining
automatic refresh; implicit OIDC+store wins over environment static fallback.
Explicit SDK `token` options would override OIDC and are not used. Outside Vercel,
retain the isolated store's static token. Connect store/environment with appropriate
OIDC access; no static secret is required when that connection works.
[Blob authentication](https://vercel.com/docs/vercel-blob/using-blob-sdk).
Keep private/current reads (`access: 'private', useCache: false`), mediated downloads,
no permanent URLs, owner metadata, intents/compensation/reconciliation/delete retry.

### Build, preview acceptance and rollback

Clean checkout, no `.env` required: `npm ci`, `npm run typecheck`, `npm test`,
`npm run build`, `npm run release:check`, `npm run runtime:check`, migration drift,
standalone evidence validators and built startup smoke (see TESTING.md).
Logs must remain generic: never raw provider errors, query URLs, cookies, request
bodies/evidence or file contents. Private no-store and security headers are asserted
locally; static platform headers/deployed behavior still need preview observation.
No brittle global CSP is added; download CSP remains restrictive.

No CLI/project link was available in this checkout. Do not automatically link/create
resources. Once an intended nonproduction project is explicitly authorized and linked,
use its current Vercel CLI `pull --environment=preview`, `build` and/or `dev` workflow
without production flags. Treat downloaded env/output as private ignored artifacts.
Record detected framework/npm/Node, generated static/Function output, route table,
bundle size and warnings. Preview deployment requires separate safe authorization.
Never promote, attach production domains or deploy with `--prod` here.

Preview smoke: root, hashed asset, `/dashboard`, `/other/client/route`, health;
unknown API JSON not SPA (owner denial may precede 404 when unconfigured);
GET auth session; POST social sign-in; workspace/data, files/reconcile/files/:id,
analyze-job, generate-resume, generate-proof-pack and workspace/application-transition
must reach their exact Express methods/paths. Use synthetic-only private staging data
for OAuth owner/non-owner, refresh/logout, revision conflicts, reload persistence,
upload/download/delete and one configured AI operation. Test cold and concurrent reuse.
Do not infer live Neon transport/locking or Blob OIDC/CDN behavior from mocks.

Rollback redeploys a previously accepted source checkpoint with the same isolated
environment; code rollback does not undo Neon migrations or Blob writes. Preserve
backups, intents and retryable cleanup; no destructive down migration or data reset.
Phase 8 remains PARTIAL until unresolved platform routing/output/body-limit behavior
is demonstrated. Then the next separately authorized phase is Phase 9. Production
order remains audit -> dev/main PR -> merged-main AI Studio verification -> Vercel
production, each at its intended stage.

## Earlier persistence implementation detail (Phase 2, retained context)

React/Vite + Express/Gemini is retained. server/local.ts serves development or
dist/client; build emits ESM dist/server.mjs. api/index.ts is the Node Vercel
adapter and vercel.json is committed. Better Auth/Google, Neon/Drizzle, migrations
and Vercel Private Blob are committed integrations, not pending working-tree work.
Use npm ci with package-lock.json; historical bun.lock is now removed from active source.

Local acceptance is not a production deployment certificate. Phase 1 deterministic
auth and Phase 2 local persistence results are recorded in the active plan and
acceptance matrices. Live OAuth/Neon/Blob and deployed runtime checks remain gates.
Phase 8 retains this architecture; live provider acceptance is not inferred from it.

## Database persistence and lifecycle

Auth users/accounts/sessions and structured owner-scoped career records coexist
in Postgres. JSONB holds evolving domain content; owner/id, lifecycle columns and
parent fields remain structured. Domain keys are composite owner/id; domain rows
cascade from workspace to owner, sessions/accounts/files from auth user. Every
repository query/replacement/deletion is owner-qualified. Job children are removed
by the repository transaction, not a job-parent SQL foreign key.

Workspace writes/imports compare the caller's nonnegative safe-integer revision,
then increment within the same transaction as all records/deletions/audit. A stale
revision is 409, invalid input is 400, unavailable storage is 503; no stale full-save
auto-merge. Reads use a repeatable-read snapshot. Supplied top-level collections
replace; omitted collections preserve. Retained jobs preserve omitted attachments
and histories; supplied uncertified legacy resume histories replace (empty clears).
Phase 5 certified versions and Phase 7 application lifecycle survive normal saves
and matching imports; lifecycle changes use the explicit transition operation. Removed jobs remove children,
not masterResume or another owner's records. Optional SQL scalars do not resurrect.

Imports merge selected IDs, retaining unrelated records. Same IDs deterministically
replace the selected record; duplicate IDs/version IDs and ambiguous child-parent
ID collisions reject atomically. Imported evidence is requires-review and imported
records carry server-generated owner-confirmed import provenance/review. Nested
candidate bullet provenance resets; job ATS status is not fabricated by import.
Malformed legacy data requires explicit conversion; validation is not weakened.

The Neon WebSocket Pool supports interactive transactions. Local persistent Node
reuses a pool and drains it on shutdown. Node serverless uses a lazy request-local
pool and auth instance; finally closes it, including response disconnect. Closed
boundaries cannot reopen during late route continuations. Public/demo requests do
not create pools. Connection errors remain explicit; no in-memory storage fallback.
See [Neon driver lifecycle](https://neon.com/docs/serverless/serverless-driver).

## Private files and compensation

Metadata includes owner, composite file ID, unique private Blob path, filename,
validated MIME/size, purpose/source and timestamps. Clients never receive Blob paths
or permanent URLs. Server-authorized downloads bypass Blob CDN cache, use validated
metadata, attachment disposition, nosniff/CSP and private/no-store. Missing object
is 404, outages/unexpected replies are 503, partial stream failures destroy the
connection rather than appending JSON. Allowed types remain PDF, UTF-8 text/LaTeX
and JSON up to 2 MiB; canonical base64 and safe filenames are required.

Before Blob put, commit an owner-scoped upload intent. A row-locked transaction
performs put -> metadata insert -> intent removal. Failure rolls metadata back;
the intent survives. Reconciliation locks/skips active uploads, checks saved
metadata before deletion, and fences delayed upload attempts. Saved objects are
never compensated after an ambiguous commit acknowledgement.

Cleanup calls idempotent Blob del and retains abandoned intent tombstones to catch
late remote puts after abort/connection loss. This is compensation, not distributed
atomicity. Failed cleanup returns an unavailable response; retry remains possible
across process restart. Subsequent uploads reconcile up to 20 owner intents first.
Explicit retry: authenticated same-origin POST /api/private/files/reconcile; repeat
for larger backlogs. Each batch has a 15-second abort signal; tombstones rotate by
last checked time and remain until a future reviewed retention policy. They contain
no file content and are not listed as files. An abort does not prove no remote put.
No unattended sweeper has been provisioned; eventual cleanup requires retry.

Deletion remains Blob first -> metadata second. Blob failure retains metadata;
DB failure after Blob removal retains metadata for retry (download then reports
missing). Repeating deletion is safe because missing Blob deletion succeeds.
See [Vercel SDK deletion/private reads](https://vercel.com/docs/vercel-blob/using-blob-sdk)
and [abort semantics](https://vercel.com/docs/vercel-blob/examples#aborting-requests).

## Configuration, migrations and live gates

.env.example names server-only GEMINI_API_KEY, DATABASE_URL, BETTER_AUTH_SECRET,
BETTER_AUTH_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, OWNER_EMAIL and
BLOB_READ_WRITE_TOKEN. Never expose their values or use browser-prefixed secrets.
Auth origin and registered Google callback must match the intended target.

db:generate generates schema migrations; db:migrate applies to configured
DATABASE_URL; db:studio opens that database. Review and explicitly authorize the
target before remote migration. Migration 0002 adds upload intents without changing
existing data; fresh migration, SQL upgrade preservation and no-drift generation
are tested locally. Never delete/recreate production data for migration recovery.

Local persistence contract: verified by synthetic PGlite/HTTP/provider fault tests.
Live Neon persistence: pending external configuration.
Live Vercel Private Blob: pending external configuration.
No local DATABASE_URL/token or .env exists; only .env.example. No resources, remote
migrations or deployment were performed. Live multi-connection locking, provider
transport/abort behavior and deployed cookies/runtime must still be accepted.

## Production order

All phases converge on dev -> release/security audit -> dev/main PR -> merged main
-> Google AI Studio pulls and verifies canonical main -> compatibility fixes through
GitHub -> main stable -> finalize Vercel production. Previews can support later
validation. No main mutation, main PR, Studio opening or production deployment
belongs to Phase 2. See DEVELOPMENT_WORKFLOW and the active execution plan.
