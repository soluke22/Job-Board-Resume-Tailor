# Productionization execution plan
## Project Goal
Truthful discovery and evidence-grounded career workflows with durable owner-only
private storage and a separate synthetic demo. GitHub remains canonical.

## Current Branch
dev. Phase 1 starts at clean 82ffed041c7c2153b8c0ef485916a2fc1e9273bc;
fetch confirmed dev == origin/dev. Publish Phase 1 by normal fast-forward only;
verify fetched origin/dev == dev and a clean working tree. No main mutation/PR.

## Current Phase
Phase 1 code-complete: authentication + public/private boundary acceptance and
demonstrated fixes. Deterministic gates pass; live Google acceptance is pending
external configuration. Phase 2 has not begun.

## Current Status
Retained Better Auth/Google OAuth, Drizzle database sessions, server owner guards,
private-file infrastructure and revisioned workspace APIs. All private surfaces
classified and tested; no custom auth replacement or unrelated domain changes.
Full before-edit matrix and final evidence: [phase-1-acceptance.md](phase-1-acceptance.md).
Public production-build browser smoke passed with all auth config absent.

## Architecture Decisions
React/Vite + Express/Gemini retained. Better Auth Google identity must be verified
and match server-only OWNER_EMAIL; owner database session required on every private
API. Signed HttpOnly/Lax cookies, Secure over HTTPS, one-day expiry/hourly renewal,
no cookie session cache and exact configured mutation origin. Previews require an
explicit canonical auth origin and Google callback; no wildcard trust added.
Sign-out uses Better Auth's adapter in a before hook to surface revocation outages.
Private browser records/auth UI state are memory-only; demo is a separate source.
Session expiration, loss and unavailable responses clear private UI/cache and
invalidate pending requests. Database/Blob integrations exist but their durable
acceptance belongs to Phase 2. npm/package-lock is authoritative; Next.js conditional.
Release audit -> dev/main PR -> merged main -> AI Studio verification -> Vercel.

## Completed Work
Phase 0/reconciliation checkpoints preserved (41a04f8 inherited integrations,
0828816 fixture correction, 82ffed0 published reconciliation state).
Phase 1: production-options and signed-cookie acceptance tests; actual installed
route denial inventory; authenticated workspace handler and storage-outage tests;
client API/cache/session generation tests; current Google profile validation;
malformed expiry and padded-secret denial; explicit server sign-out outage and
retry; best-effort cross-tab notification; idle/focus/expiry session validation;
stale workspace/export/AI rejection; public auth probing isolation.
Corrected stale current-state/privacy/architecture/testing descriptions.

## Acceptance Criteria
Phase 1 deterministic pass: email-only/forged/missing/non-owner/unverified/expired/
revoked access denied; verified configured owner accepted; session/database outages
fail closed; invalid origin denied and valid owner mutation reaches handler;
private failures never return demo content; no bearer/query/localStorage auth;
private/auth/file/export no-store; coherent cache clearing and blank private setup.
Live Google OAuth acceptance pending external configuration.
Authenticated rendered OAuth browser lifecycle and deployed cookies remain live gates.

## Tests Passed
2026-09-12: focused auth-security + phase-1-auth + phase-1-client (19 tests);
complete npm test (20 tests including inherited PGlite workspace contract);
typecheck/build; harness integrity/evidence/privacy positive and negative fixtures;
strict privacy scan with required public build (zero rule findings); release:check.
Public browser smoke: production build loads synthetic dashboard with missing auth
config; private toggle opens Google-only modal; sign-in explicitly unavailable;
cancel returns to functioning synthetic demo. No live provider call succeeded.
Build: 533.65 kB client chunk versus 531.60 kB inherited baseline; same warning,
about 0.4% growth, no material Phase 1 bundle regression. git diff --check passes.

## Tests Failing
None in final deterministic gate. No validator weakened. Synthetic auth outage
and invalid callback tests intentionally produce library error logs without secrets.
Full live authenticated browser and remote persistence tests are unavailable.

## Security Review
Configured read-only security-reviewer (Sol High) reviewed Phase 1 only.
One concrete P2 finding: blocked/quota-limited browser storage could abort logout
before server revocation. Reviewer reproduced zero server logout calls with a
SecurityError. Fixed via tested signOutPrivateWorkspace helper: clear private
client state, best-effort broadcast, guaranteed server request, explicit retry.
Reviewer rechecked fix and six client tests; finding resolved, no other demonstrated
boundary defect. Later public-probe/body-read outage regressions passed final gate.

## Known Blockers
Live Google OAuth acceptance pending external configuration. All required auth
values absent from local process environment and no local .env file exists.
Neon/Blob durable persistence, deployed cookie behavior and complete authenticated
browser lifecycle remain unverified. ATS/evidence semantics and SSRF remain later
phases. Static privacy/ID checks cannot certify all privacy or provenance.

## External Configuration Needed
Server-only OWNER_EMAIL, Google client ID/secret and registered callback,
BETTER_AUTH_SECRET, canonical BETTER_AUTH_URL and Neon DATABASE_URL/schema.
Phase 2/live file workflows additionally need private BLOB_READ_WRITE_TOKEN;
Gemini workflows need GEMINI_API_KEY. No secrets added or remote migration/deploy run.

## Files / Modules Currently Involved
server/auth.ts, workspaceRoutes.ts, server.ts/privateFiles.ts installation and guards;
API/storage/AppContext/AuthModal/setup lifecycle; tests/auth-security.test.ts and
phase-1-auth/phase-1-client.test.ts; PRIVACY_BOUNDARY, ARCHITECTURE, TESTING and matrix.
DB schema/client reviewed as auth dependencies; no Phase 2 persistence redesign.

## Last Known Good Commit
82ffed041c7c2153b8c0ef485916a2fc1e9273bc: clean published Phase 1 starting baseline.
The validated Phase 1 checkpoint is the latest commit touching this plan:
git log -1 -- docs/exec-plans/active/productionization.md.
Use git rev-parse dev origin/dev after fetch for publication receipt; avoid a
self-referential commit hash. Final deterministic results are recorded above.

## Next Exact Step
On clean dev, fetch origin and confirm dev == origin/dev. Read
.agents/skills/vercel-deployment/SKILL.md and docs/DEPLOYMENT.md; audit inherited
Neon/Drizzle workspace and Private Blob persistence against durable restart,
owner scoping, revisions/import integrity and storage-outage acceptance before
changing code. Record a Phase 2 acceptance matrix; Phase 1 did not certify
persistence. Phase 2 is Durable database + private file persistence acceptance.

## Remaining Phases
1. Authentication boundary code-complete; live Google OAuth acceptance pending.
2. Durable database + private file persistence acceptance.
3. Job discovery + ATS truthfulness + freshness + dedupe.
4. Evidence-grounded qualification/ranking.
5. Resume provenance + tailoring + manual validation.
6. Proof packs + outreach + application answers.
7. Application tracking + outcome analytics.
8. Vercel-compatible architecture completion.
9. Security/privacy/release audit.
10. dev -> main PR (separate authorization).
11. Google AI Studio verifies merged canonical main.
12. Vercel production after main/Studio verification.
