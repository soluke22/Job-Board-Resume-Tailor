# Deployment

## Current State — committed dev implementation

React/Vite + Express/Gemini is retained. server/local.ts serves development or
dist/client; build emits ESM dist/server.mjs. api/index.ts is the Node Vercel
adapter and vercel.json is committed. Better Auth/Google, Neon/Drizzle, migrations
and Vercel Private Blob are committed integrations, not pending working-tree work.
Use npm ci with package-lock.json; historical bun.lock is not authoritative.

Local acceptance is not a production deployment certificate. Phase 1 deterministic
auth and Phase 2 local persistence results are recorded in the active plan and
acceptance matrices. Live OAuth/Neon/Blob and deployed runtime checks remain gates.
Next.js remains conditional; no full Phase 8 migration was performed here.

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
and histories; supplied histories replace (empty clears). Application fields of a
supplied job replace their stored application record. Removed jobs remove children,
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
