# Productionization execution plan

## Project Goal

Truthful discovery and evidence-grounded career workflows with durable owner-only
private storage and a separate synthetic demo. GitHub remains canonical.

## Current Branch

dev only. Phase 2 began at clean b8c99995d88be4313587fa861ded2c8cf24e1980,
equal to fetched origin/dev. First checkpoint 936a869 was retained unpublished;
request continuation explicitly authorizes normal fast-forward push of Phase 2.
No main mutation, main PR, Studio opening, deployment or Phase 3 implementation.

## Current Phase

Phase 2 code-complete: local persistence contracts pass; live Neon/Blob acceptance
pending external configuration. Publish validated checkpoints by normal fast-forward
and verify fetched dev == origin/dev and clean status before handoff.
Scope: acceptance and demonstrated fixes to inherited Neon/Drizzle/private Blob,
not a persistence redesign or Phase 8 hosting migration. Full before-edit matrix,
checkpoint history and final local evidence: [phase-2-acceptance.md](phase-2-acceptance.md).
Phase 1 is deterministic code-complete; live Google OAuth remains pending.

## Current Status

All 33 deterministic tests and final release composition pass. Missing harness
headings after the plan rewrite were restored; validator unchanged and re-run passed.
Startup smoke and migration no-drift/fresh/upgrade preservation pass.

## Architecture Decisions / Persistence Semantics

React/Vite + Express/Gemini, Better Auth Google/database sessions, Neon/Drizzle
owner-scoped tables and Vercel Private Blob retained. No production memory fallback.
JSONB is valid for evolving record content; ownership/lifecycle remain structured.
All domain/file queries are owner-qualified; composite owner/id keys isolate shared
IDs. Auth/domain/file FK cascades are tested; job children delete in owner transaction.

Reads are repeatable-read snapshots. Writes/imports increment conditional revisions
inside one transaction containing entity writes/deletions and audit. Stale revision
409, invalid input/revision 400, storage unavailable 503; no stale full-save auto-merge.
Supplied collections replace; omitted ones preserve. Retained job attachments and
histories preserve when omitted; explicit histories replace/empty clears. Supplied
application fields replace the application record. Removed jobs leave no children;
masterResume/other owners persist. Omitted optional SQL scalars cannot resurrect.

Imports merge selected IDs and retain unrelated state; conflicts replace the selected
record, duplicate/version/ambiguous child-parent IDs reject atomically. Imported
evidence requires-review; imported records/application data carry server import
provenance/review and nested candidate bullet provenance resets. ATS status is not
invented by import. Malformed legacy data requires explicit conversion.

Files use private Blob and durable owner metadata. A committed upload intent precedes
put; row-locked transaction finalizes metadata/removes intent. Failed cleanup leaves
retryable durable intent/tombstone. Reconciliation checks saved metadata, fences
delayed uploads, skips active locks and repeats idempotent deletes to catch late puts.
No distributed atomicity or automatic cleanup is claimed. Owner POST reconcile/next
upload retries bounded batches (20 paths, one 15-second Blob abort signal). Abandoned
tombstones retain paths until a future reviewed retention policy, not file contents.
Blob-first deletion retains metadata on either failure; retry safely removes missing
Blob/remaining DB record. Missing download 404, outage/unexpected reply 503; partial
stream error destroys connection. Paths never appear in client metadata; private/
no-store, attachment, nosniff/CSP retained. Types bounded at 2 MiB with canonical
base64, UTF-8/PDF-signature/JSON and safe filename validation.

Persistent Node reuses pool until shutdown. Node serverless uses lazy request-local
pool/auth instances and drains on completion/disconnect. Closed boundaries reject
late async access rather than opening an unclosed pool. No private credentials
or records in client/source/build. Existing browser memory is cache only; auth loss/
storage 503 clears it, conflict 409 retains edits but requires explicit reload.

## Completed Work / Fixes

Historical: 41a04f8 inherited integrations, 0828816 fixture correction, 82ffed0
reconciliation; Phase 1 validated at b8c9999. Phase 1 matrix records cookie/origin/
owner/session/client lifecycle acceptance and logout storage-error fix.
Phase 2 checkpoint 936a869: scalar/history replacement fixes, restart/rollback/
revision/owner/import extensions and initial file failure matrix.
Continuation: ambiguous history parent collision rejection, duplicate version
validation, nested candidate/application import provenance, durable upload recovery,
consistent private downloads, safe validation, DB lifecycle/disconnect fix, additive
migration and complete fault/HTTP/client/startup acceptance tests. Deployment/current
state docs corrected; no discovery/evidence ranking/tailoring work begun.

## Acceptance Criteria

Local contracts covered: disk DB/repository reopen, exact transaction rollback via
real SQL triggers (including after history deletion), conditional/stale/concurrent
revisions, same-ID owners, replacement/job-child isolation, atomic merge/import
review, file metadata restart/ownership, upload intent recovery/late-write retries,
ambiguous commit protection, delete retries, private stream failure/validation and
provider-independent public shell. See matrix for exact evidence and limitations.

## Tests Passed

Focused Phase 2 and auth/client suites pass; complete npm test passes 33/33.
Final release:check passes typecheck/build, harness/evidence/privacy fixtures, all
tests and strict public-build privacy scan (zero findings). Startup smoke 1/1 passes.
db:generate reports no drift; fresh committed migrations apply through PGlite;
SQL upgrade 0002 preserves workspace/files/auth sessions. No remote migration run.
Built Node shell/assets and source Node serverless startup smoke pass with all
private configuration absent. Client chunk remains 533.65 kB (existing warning),
client application source unchanged from Phase 1 public-demo acceptance.
No new rendered OAuth claim.

## Tests Failing

None in final gate. Harness heading failure corrected; final re-run passed.
Synthetic provider/DB failures are intentional test fixtures, not live outages.

## Security Review

Reused read-only security-reviewer (Sol High) found one demonstrated P2: response
disconnect followed by late route work reopened a second pool after cleanup
(2 created/1 ended). Fixed terminal boundaries; identical HTTP reproduction now
1 created/1 ended and late access denied. Reviewer rechecked relevant tests (7/7);
no additional demonstrated owner/transaction/unsafe-file/compensation defect.
Read-only docs-researcher confirmed official Neon Pool/Blob deletion/private read/
abort behavior before file/lifecycle decisions. No unsupported atomicity assumptions.

## Known Blockers / External Configuration

Local persistence contract: verified (synthetic Postgres-compatible/Blob faults).
Live Neon persistence: pending external configuration.
Live Vercel Private Blob: pending external configuration.
DATABASE_URL and BLOB_READ_WRITE_TOKEN are absent from local process; no .env exists,
only .env.example. No provider resources created, remote migrations or deployment.
PGlite serializes transactions on one connection, so live Neon multi-connection
locking/disconnect transport remains a live gate. Blob CDN/abort/late-put semantics
need live acceptance. Cleanup requires owner retry; no unattended sweeper provisioned.
Live Google OAuth/cookies and full authenticated browser remain Phase 1/live gates.
SSRF, ATS, semantic evidence/ranking/tailoring correctness remain later phases.
## External Configuration Needed

Needed server-only config: OWNER_EMAIL, Google ID/secret/callback, BETTER_AUTH_SECRET,
canonical BETTER_AUTH_URL, Neon DATABASE_URL/schema, private BLOB_READ_WRITE_TOKEN;
GEMINI_API_KEY for later AI workflows. No secrets/private data added or logged.

## Files / Modules Currently Involved

server/db, workspaceRepository/validation/routes acceptance, privateFileRepository/
privateFiles, auth per-DB instances, api/index.ts and server/local.ts DB lifecycle;
focused Phase 2 tests/helpers and auth/client regressions; DEPLOYMENT, ARCHITECTURE,
PRIVACY_BOUNDARY, TESTING and Phase 2 matrix/plan. Parent owns writes; no swarm.

## Last Known Good Commit

Last validated checkpoint: 936a869. Locate final plan checkpoint with
git log -1 -- docs/exec-plans/active/productionization.md; no self-hash loop.
Verify git rev-parse dev origin/dev after fetch and clean status after publication.

## Next Exact Step

Phase 3 — Job discovery + ATS truthfulness + freshness + dedupe.
Begin only on a new explicit continuation after Phase 2 publication verification;
this Phase 2 task stops after its final report. Release audit precedes dev/main PR,
merged-main Google AI Studio verification and final Vercel production.

## Remaining Phases

1. Authentication code-complete; live Google/cookie/browser acceptance pending.
2. Durable database/private files code-complete; live Neon/Blob acceptance pending.
3. Job discovery + ATS truthfulness + freshness + dedupe.
4. Evidence-grounded qualification/ranking.
5. Resume provenance + tailoring + manual validation.
6. Proof packs + outreach + application answers.
7. Application tracking + outcome analytics.
8. Vercel-compatible architecture completion/live runtime acceptance.
9. Security/privacy/release audit.
10. dev -> main PR (separate authorization).
11. Google AI Studio verifies merged canonical main.
12. Vercel production after main/Studio verification.
