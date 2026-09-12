# Phase 2 persistence acceptance

Baseline: clean dev == fetched origin/dev at b8c99995d88be4313587fa861ded2c8cf24e1980.
Scope: inherited persistence acceptance and demonstrated fixes only; no Phase 3,
remote migrations, deployment, or persistence redesign. Synthetic local data only.
Request continuation received on 2026-09-12 (sections 13–23). Finish local acceptance,
record live providers pending, checkpoint and push dev fast-forward; stop before Phase 3.

## Before-edit acceptance matrix

| Requirement | Current implementation | Evidence/file/test | Status | Required fix |
| --- | --- | --- | --- | --- |
| Durable workspace | Postgres transactions; no memory fallback | db/client.ts, workspaceRepository.ts | Pass (local architecture) | Live Neon gate |
| Restart | Disk PGlite close/reopen plus recreated repository | workspace.test.ts | Pass (local only) | Preserve explicit remote limitation |
| Owner scoping | Composite owner/id keys and owner-qualified queries | schema.ts, workspace.test.ts | Pass | Extend deletion/audit assertions |
| Same IDs across owners | Composite keys | workspace.test.ts | Pass | None |
| Optimistic revisions | Conditional revision update in transaction | workspaceRepository.ts | Pass | None |
| Concurrent/stale writes | One winner; stale throws conflict | workspace.test.ts, workspaceRoutes.ts | Pass | Extend invalid/stale import checks |
| Transaction rollback | Transaction encloses revision/entities/audit | workspaceRepository.ts | Unverified mid-write | Real SQL failure injection test |
| Replacement | Explicit top-level collections replace; omitted attachments preserve | workspaceRepository.ts | Fail | Explicit history lists retain removed entries; scalar columns retain omitted old fields |
| Job removal | Explicit owner-qualified child deletion | workspaceRepository.ts | Unverified | Child-table assertions |
| Import merge | Selected IDs upsert; unrelated IDs retained | workspace.test.ts | Pass | Extend conflict/atomicity checks |
| Import provenance | Server review/provenance normalization | workspaceRepository.ts | Pass for top-level evidence | Nested review acceptance remains audit work |
| Migration agreement | Two SQL migrations and snapshots committed | migrations/, schema.ts | Unverified | Safe local generation comparison |
| DB outages | Errors propagate; routes return 503 | phase-1-auth.test.ts | Pass route boundary | Connection lifecycle audit remains |
| File metadata ownership | Owner-qualified SQL and composite keys | privateFiles.ts | Unverified real DB | Persistence test |
| Blob privacy | Private put/get; server-proxied download | privateFiles.ts | Pass architecture | Live Blob gate |
| Upload partial failure | Compensation attempted; failed cleanup swallowed | privateFiles.ts | Unverified / gap | Durable reconciliation strategy needed |
| Download partial failure | Missing object 404; exceptions 503; stream destroys after headers | privateFiles.ts | Unverified | Failure matrix tests |
| Delete partial failure/retry | Blob first, DB second | privateFiles.ts | Unverified | Verify official idempotency and test retry |
| File size/type | Bounded base64, PDF signature, UTF-8, JSON parse | privateFiles.ts, auth-security.test.ts | Pass basic validation | Extend boundary cases |
| Storage outage | 503 without synthetic fallback | privateFiles.ts | Unverified combinations | Failure matrix tests |

Acceptance requires restart-safe owner state, atomic revisioned changes, deterministic
replacement/import semantics, migration agreement, and safe tested file compensation.
Local PGlite proves application restart independence, not remote Neon durability.

## Validated checkpoint — 2026-09-12

Fixed omitted scalar replacement (old SQL values no longer resurrect) and explicit
job history replacement (removed entries deleted for that owner/job). Empty history
lists clear; omitted lists preserve; imports still merge selected IDs.

The disk PGlite test recreates DB/repository after close; expanded coverage includes
file metadata restart, invalid revisions, stale/malformed imports, audit owner
isolation and job/child deletion. A real SQL trigger fails mid-save; exact snapshot
equality proves revision/deletion/insert/audit rollback. No rollback mocks used.

db:generate reports no changes and committed migrations apply locally. No remote
migration was run. db:generate/db:migrate/db:studio scripts remain accurate.
File fault test covers put/insert/cleanup failures, missing/failed download,
safe headers and both delete failure orderings. Its Blob double models documented
idempotency; it does not prove live Blob behavior. Official
[Vercel SDK docs](https://vercel.com/docs/vercel-blob/using-blob-sdk#del)
confirm deleting a missing Blob does not throw, allowing metadata deletion retry.

release:check passes: 21/21 tests, typecheck/build, harness and strict public-build
privacy scan (zero findings). Client chunk unchanged at 533.65 kB; existing warning.
Read-only security review found no introduced owner/transaction defect in scalar
or history replacement; focused tests passed 2/2. Nonempty history pruning and
rollback specifically after history deletion remain coverage limitations.

## Checkpoint 936a869 remaining acceptance — historical, resolved below

Continuation scope before edits: add a durable owner-scoped upload intent before
Blob put; protect metadata finalization/cleanup with transaction row locks. Retain
abandoned cleanup intents for repeated reconciliation (including a late Blob put
after process/DB connection loss). Never compensate an ambiguous successful commit
by deleting a saved object's Blob. Bound owner-triggered reconciliation; test persisted
restart/failures and locking/fencing. Keep existing workspace/schema architecture.
Also test and fix demonstrated history-ID parent collision or import review gaps,
complete upload/stream/outage/owner/replacement tests, audit connection lifecycle,
correct deployment docs and run final release checks. No provider resources created.

Failed upload compensation demonstrably leaves an inaccessible private orphan.
Implement minimal restart-safe reconciliation with explicit handling of ambiguous
DB insert results and in-flight uploads. Do not delete objects merely absent from
a transient DB read. Prove recovery with persisted metadata and fault tests.

Remaining: complete collection/attachment/application replacement coverage, nested
import review/provenance audit, conflicting history IDs, real file repository query
isolation, comprehensive size/type/stream failures, connection lifecycle/cleanup,
startup smoke and full final acceptance. Remote Neon/Blob durability remains a live
gate without credentials. Obtain the request continuation after truncated section 13.

## Final local acceptance matrix — 2026-09-12

| Requirement | Implementation / evidence | Local result | Fix / limitation |
| --- | --- | --- | --- |
| Durable workspace | Neon/Drizzle queries; workspace.test.ts disk reopen | Pass | Live Neon pending |
| Process/repository restart | DB close/reopen and recreated repositories for workspace/files | Pass | Not live Neon proof |
| Owner scope/same IDs | Composite keys; two-owner repository/HTTP tests | Pass | No auth UI flag authority |
| Revision protection | Conditional update; actual HTTP 409/400 tests | Pass | No stale auto-merge |
| Concurrency/stale imports | One winner; stale save/import leaves exact snapshot | Pass | PGlite serializes connection |
| Rollback | Real job/audit triggers fail after mutations/history deletion | Pass | Revision/data/deletion/audit restored |
| Collections/replacement | Explicit evidence/projects/skills/experiences/jobs lists; application fields | Pass | Optional SQL scalar/history pruning fixed |
| Job children/attachments | All seven mappings preserve omission and delete removed jobs | Pass | Master resume/other owners retained |
| Import merge/conflicts | Selected IDs overwrite, unrelated state retained; duplicate/ambiguous IDs rejected | Pass | Parent-ID collision/duplicate versions fixed |
| Import provenance/review | Evidence review, nested resume bullets, application SQL record, owner audit | Pass | Nested/application approval gaps fixed; ATS unknown stays unknown |
| Migration/schema | Fresh PGlite migrator, additive SQL upgrade, db:generate no drift | Pass | 0002 adds intents; no remote migration |
| DB outages | Actual HTTP read/write 503; SQL triggers and client access clearing | Pass | No demo/fake success |
| DB lifecycle | Local reuse, request-local/auth isolation, close/failure/late work tests | Pass | Reviewer disconnect leak fixed |
| File metadata ownership | Real repository same IDs/timestamps, owner lookup/removal, reopen | Pass | Unique paths; no path/owner API exposure |
| Blob privacy/download | Private put/get, uncached proxy, attachment/nosniff/no-store | Pass | Live Blob pending |
| Upload partial failures | Durable intent before put; real metadata failure and compensation failure/reopen | Pass | Retryable tombstones retain late puts; not distributed atomicity |
| Download partial failures | Missing 404; outages/unexpected reply 503; partial stream disconnect | Pass | JSON never appended after headers |
| Delete failure/retry | Blob failure preserves metadata; DB failure leaves metadata for idempotent retry | Pass | Missing Blob download 404; documented del semantics modeled |
| Size/type/base64/filename | Oversize/empty/malformed/base64/UTF-8/PDF/JSON/MIME/purpose/source cases | Pass | Exact 2 MiB accepted; canonical/safe validation tightened |
| Storage outage/retry | DB/Blob put/get/del/cleanup failure matrix; owner POST reconciliation | Pass | Owner retry required, no sweeper provisioned |
| Public/demo independence | Auth/client isolation + built Node shell/assets and adapter with no private config | Pass | Client application source unchanged; Phase 1 rendered smoke retained |

### Fixes and distributed failure semantics

936a869 fixed stale optional SQL scalar resurrection and explicit history pruning.
Continuation regressions demonstrated history delimiter collision moving a child,
duplicate versions collapsing, verified nested import bullets and missing application
import provenance. These now reject/review appropriately without altering ATS status.

private_file_uploads commits owner/id/path before put, locks during finalization and
retains abandoned tombstones for failed/late puts. Reconciliation skips active locks,
fences delayed upload, checks saved metadata and never compensates an ambiguous
successful commit. Actual DB commit + lost acknowledgement and delayed-uploader
tests prove those local branches. Blob abort is unresolved, not proof of absence.
Owner POST /api/private/files/reconcile or subsequent upload retries up to 20 paths
with one 15-second batch abort signal; tombstones rotate and remain for repeat checks.
No cleanup completion/automatic eventual deletion is claimed without retry.

### Review and official behavior

Reused Sol High read-only security-reviewer reproduced one P2: client disconnect
allowed late DB access to create an unclosed second pool (2 created/1 ended).
Terminal-boundary fix rechecked with identical HTTP reproduction: 1 created/1 ended,
late access denied. Reviewer rechecked 7/7 relevant tests; no other demonstrated
owner/transaction/file/compensation defect. Earlier review limits (nonempty pruning
and post-history rollback) now have real SQL tests.

Luna read-only docs-researcher verified official [Neon request lifecycle](https://neon.com/docs/serverless/serverless-driver),
[Blob deletion/read semantics](https://vercel.com/docs/vercel-blob/using-blob-sdk),
and [caller abort behavior](https://vercel.com/docs/vercel-blob/examples#aborting-requests).
Installed Blob 2.8.0 supports useCache:false; missing-object del does not throw.
No documented exactly-once or distributed atomicity guarantee is assumed.

### Live gate and final validation

Local persistence contract: verified.
Live Neon persistence: pending external configuration.
Live Vercel Private Blob: pending external configuration.
No DATABASE_URL/Blob token or .env locally (only example); no resources, deployment,
remote migrations or actual provider calls. Live multi-connection Neon transport/
locking and Blob CDN/abort/late-write behavior remain live gates; PGlite's single
serialized connection and synthetic provider doubles cannot certify them.

Complete npm test passes 33/33; focused Phase 2 passes. Typecheck/build and strict
public-build privacy scan (zero findings) pass. Fresh/upgrade migration and
no-drift generation pass. Built Node/Node serverless startup smoke passes without
private configuration. Plan rewrite temporarily omitted required harness headings;
restored headings without weakening checks. Final release composition re-run passed.
Semantic evidence validators are unaffected; harness positive/negative ID/privacy
fixtures pass. No candidate/JD facts were invented; Phase 3 was not started.

Phase 2 result: Pass / code-complete for deterministic local contracts, with the
explicit live provider gates above. Normal fast-forward publication to origin/dev
is authorized by the continuation; verify clean status and fetched HEAD equality.
