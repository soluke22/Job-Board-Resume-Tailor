# Phase 2 persistence acceptance

Baseline: clean dev == fetched origin/dev at b8c99995d88be4313587fa861ded2c8cf24e1980.
Scope: inherited persistence acceptance and demonstrated fixes only; no Phase 3,
remote migrations, deployment, or persistence redesign. Synthetic local data only.
The supplied request ends mid-section 13; remaining instructions are unavailable.

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

## Remaining acceptance — Phase 2 NOT complete

Failed upload compensation demonstrably leaves an inaccessible private orphan.
Implement minimal restart-safe reconciliation with explicit handling of ambiguous
DB insert results and in-flight uploads. Do not delete objects merely absent from
a transient DB read. Prove recovery with persisted metadata and fault tests.

Remaining: complete collection/attachment/application replacement coverage, nested
import review/provenance audit, conflicting history IDs, real file repository query
isolation, comprehensive size/type/stream failures, connection lifecycle/cleanup,
startup smoke and full final acceptance. Remote Neon/Blob durability remains a live
gate without credentials. Obtain the request continuation after truncated section 13.
