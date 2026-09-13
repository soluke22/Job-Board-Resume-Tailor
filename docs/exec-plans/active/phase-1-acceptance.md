# Phase 1 authentication acceptance

Scope: audit inherited Better Auth and actual server/client boundaries on dev.
Acceptance: verified configured Google owner plus an unexpired database session
is required for every private operation; failures clear private access, never
return demo content, and private responses are not publicly cached. Phase 2
persistence acceptance is excluded. Baseline: clean 82ffed0, fetched origin/dev
equals dev. No local .env file exists; live credentials remain unverified.

## Before-edit matrix (2026-09-12)

| Requirement | Current implementation | Evidence/file | Status | Required fix/proof |
| --- | --- | --- | --- | --- |
| Google only; no email/password/public signup | Google configured; password disabled; user/session creation owner hooks | server/auth.ts | Implemented, insufficiently tested | Exercise actual production options/hooks |
| Verified server owner identity | isOwnerIdentity and owner guard | server/auth.ts | Pass synthetic identity cases | Test actual session minting rejection |
| Required config; origin; secret; HTTPS cookies | Required values, canonical URL, 32 characters, secure HttpOnly Lax | server/auth.ts | Implemented, insufficiently tested | Config/cookie/callback regression cases |
| Database sessions; expiry; immediate revocation | Drizzle; one day; no cookie cache | server/auth.ts, server/db/schema.ts | Implemented, insufficiently tested | Real signed-cookie session lookup/revocation; malformed expiry denies |
| Logout failure reported | Better Auth signOut catches database delete errors and returns success | node_modules/better-auth/dist/api/routes/sign-out.mjs | Fail | Ensure deletion failure propagates before success |
| Workspace read/write/import/export/audit | Scoped protected router | server/workspaceRoutes.ts | Implemented, insufficiently tested | Real router denial and outage tests |
| Private file upload/list/download/delete | Direct guard and owner-scoped metadata lookup | server/privateFiles.ts | Pass focused file test | Extend cache/denial coverage |
| Candidate/evidence/resume/Gemini/search/job operations | All remaining /api routes inherit guard | server.ts:29 | Implemented, insufficiently tested | Deterministic installed route inventory/denial test |
| Mutation origin and OAuth callback | Exact configured origin for mutations; Better Auth callback validation | server/auth.ts | Implemented, insufficiently tested | Local/canonical/preview origin and callback cases |
| No bearer/query/localStorage authentication | Cookie credentials; identity and private records in memory | api.ts, storage.ts | Pass inspection | Deterministic regression checks |
| Refresh/empty private setup/demo separation | Session then workspace restore; blank private defaults; separate demo | AppContext.tsx, CandidateSetupView.tsx | Implemented, insufficiently tested | Isolation/cache tests |
| Session loss/outage/idle expiry clears private state | 401/403 event; no idle session validation; 503 leaves private cache | AppContext.tsx, api.ts | Fail | Session revalidation and unavailable cleanup |
| Stale async replies after session/mode change | AI generation check; workspaceRequest unchecked; demo switch not invalidated | api.ts, AppContext.tsx | Fail | Apply generation check to workspace reads/exports and mode transitions |
| Private/auth/file/export no-store | Guard and auth middleware set headers | server/auth.ts | Pass inspection | Assert headers on actual responses |
| Current source-of-truth docs | Historical token/localStorage/pending-work descriptions | PRIVACY_BOUNDARY.md, ARCHITECTURE.md, TESTING.md | Fail | Replace stale current-state descriptions |
| Live Google OAuth | No local .env; external configuration required | local configuration inventory | Unverified external | Live Google OAuth acceptance pending external configuration. |

## Outcome
Code-complete, deterministic acceptance pass. Live Google OAuth acceptance pending
external configuration. Complete authenticated rendered lifecycle and deployed
cookies remain live gates, rather than claimed successes.

| Requirement group | Final status | Proof / disposition |
| --- | --- | --- |
| Google-only/owner/verified identity and session minting | Pass deterministic | Exact production options/hooks; current provider profile checked even for linked accounts; rejected non-owner legacy row cannot mint session |
| Required config, secret, origin, cookies, callback | Pass deterministic | All missing values, malformed origins, padded/short secret, production HTTP denied; actual Secure/HttpOnly/Lax attributes, rejected foreign callback, canonical OAuth URL/state |
| Expiry/revocation/auth outage | Pass deterministic | Real signed cookie and library session reader; malformed expiry denied; adapter lookup outage returns 503; sign-out deletion outage explicit; revoked cookie denied |
| Private route authorization | Pass deterministic | Installed Express inventory: 14 remaining application APIs + 5 private file methods; 5 workspace operations; actual unauthorized HTTP denial, owner-scoped handler and outage tests |
| Mutations | Pass deterministic | Wrong/missing origin denied; exact local origin owner mutation accepted; HTTPS canonical preview callback/origin test; no arbitrary preview trust |
| Private cache/export/file delivery | Pass deterministic/inspection | Private/auth/export HTTP no-store; private file guard sets no-store before stream; no static/service-worker private cache |
| Client cache/lifecycle | Pass deterministic plus scoped public browser smoke | Real API/storage tests: memory-only data, explicit 401/403/503/network/body failure cleanup, generation invalidation, old failure race, logout storage failure/retry; AppContext expiry/focus/visibility wiring inspected |
| Demo/setup isolation | Pass deterministic/public browser | Blank private profile/empty evidence stay separate from synthetic source; private storage outages return only error; public probing does not trigger private-loss banner; missing-config sign-in remains public and explicit |
| Legacy auth regressions | Pass deterministic | No bearer, auth URL query or persisted auth token path in actual auth surfaces |
| Current documentation | Pass | PRIVACY_BOUNDARY, ARCHITECTURE and TESTING current state rewritten; no Phase 2 acceptance claim |
| Live Google/deployed auth/browser lifecycle | Unverified external | Required auth env values absent and no local .env; no fabricated success |

## Demonstrated fixes
- Verify the current Google profile as well as stored user/session rows; keep
  existing user/session owner hooks and disabled account linking/password auth.
- Reject malformed expiry and short secrets padded with whitespace.
- Surface Better Auth 1.7.4 sign-out deletion failure through its before hook and
  session adapter; retain native cookie deletion and session infrastructure.
- Clear private access on unavailable/network/body failures; revalidate idle/focus
  sessions and schedule expiry from the server; keep public probes independent.
- Reject stale workspace/export/AI responses and sync-to-import/export races on
  logout or mode transition; reset private processing UI during clearance.
- Expose failed server logout retry; browser notification storage is best effort.

## Security review
Read-only configured security-reviewer found one P2: localStorage notification
failure prevented the server logout call. It reproduced zero revocations with
SecurityError. Fixed in the real signOutPrivateWorkspace helper and covered by
blocked-storage/503/retry regression. Reviewer rechecked and confirmed resolution;
no other demonstrated Phase 1 defect. No stylistic redesign accepted.

## Validation and boundaries
Focused Phase 1 suite: 19 passing. Full npm test: 20 passing. typecheck, build,
harness:check, strict privacy:scan --require-build, release:check, diff check pass.
Final client chunk 533.65 kB (baseline 531.60); existing warning retained.
Production browser smoke with missing auth configuration passed dashboard,
Google-only modal, explicit unavailable sign-in and return to synthetic demo.
No live Google, Neon or Blob acceptance performed; Phase 2 not started.

Library decisions checked against installed code and official
[session management](https://better-auth.com/docs/concepts/session-management),
[cookies](https://better-auth.com/docs/concepts/cookies) and
[options](https://better-auth.com/docs/reference/options). Disabled cookie caching
ensures immediate server revocation checks; a passing synthetic fixture does not
prove live provider/deployment acceptance.
