# Productionization execution plan
## Project Goal
Productionize truthful discovery and evidence-grounded career workflows with
owner-only durable private storage and an isolated synthetic public demo.

## Current Branch
dev. main remains untouched. No push, main PR or production deploy authorized here.

## Current Phase
Phase 0: operating harness. Next: Phase 1 Authentication + public/private boundary.

## Current Status
Phase 0 completed; validation results below. Product phases remain pending.
Pre-existing uncommitted product changes overlap Phases 1/2/8; preserve and audit
them before further implementation. They are excluded from the Phase 0 commit.
The committed baseline is 1a620d67a97142d468f3cace5ed90a308aa5a811;
its historical commit title “Implement Phase 1” denotes earlier documentation,
not completion of this plan's authentication phase.

## Architecture Decisions
React/Vite + Express/Gemini retained for Phase 0. Pending local work introduces
Better Auth, Neon/Drizzle and Private Blob; external behavior is not certified.
Next.js remains conditional. GitHub → merged main → Studio → Vercel order applies.
Parent Sol Medium owns writes; optional narrow read-only helpers, maximum two.

## Completed Work
Phase 0 router, eight discoverable skills, specialist definitions/configuration,
workflow, current/target knowledge, deterministic harness/privacy checks and
durable state. No Phases 1–12 implementation performed by this task.

## Acceptance Criteria
Phase 0: discoverable routing, supported config, six routing exercises, honest
baseline comparison, checks run, scoped checkpoint, resumable next step.
Phase 1: verified owner authentication, server-enforced denial/ownership,
isolated empty private setup, revoked sessions and outage fail-closed behavior;
actual Google OAuth flow and public/private UX verified.

## Tests Passed
2026-09-12: npm run lint and npm run build pass on inherited working tree.
npm test: five auth/file/session tests pass; one workspace test fails.
Harness integrity, evidence and privacy positive/negative fixtures pass.
Strict privacy triage scans public build with zero rule findings.
Five agent/config TOMLs parse with Python tomllib; six routing simulations pass.
Bundled skill quick_validate cannot run: PyYAML absent in both Python runtimes;
repository harness validator checks all eight skill names/frontmatter/paths.
release:check correctly returns failure on the inherited persistence test.

## Tests Failing
Inherited tests/workspace.test.ts at save: “Invalid workspace or revision”.
Not harness-induced; do not claim persistence acceptance passed.

## Known Blockers
Large pre-existing product diff requires reconciliation and review.
Live OAuth, Neon, Blob and deployment acceptance not verified.
Discovery/provenance gaps remain; see domain docs.

## External Configuration Needed
Server-only Google OAuth credentials/redirect URI, owner identity, Better Auth
secret/origin, Neon DATABASE_URL, private Blob token and Gemini key.
Do not store values in this plan. Final production configuration waits Phase 12.

## Files / Modules Currently Involved
Harness: AGENTS.md, .agents/skills, .codex, docs, scripts, package scripts.
Pending product: server.ts, server/auth.ts, server/db, workspaceRepository/routes,
privateFiles/privacy/local, api/index.ts, migrations, src/context/AppContext.tsx,
src/services, candidate/job/resume UI, private seed, env/config and tests.
Use git status for the exact pending inventory rather than rereading all files.

## Last Known Good Commit
Harness predecessor: 1a620d67a97142d468f3cace5ed90a308aa5a811.
Phase 0 checkpoint: latest commit touching this plan (git log -1 -- this path).
No product-wide all-tests-green revision is certified.

## Next Exact Step
On dev inspect git status and HEAD, read workspace-security/SKILL.md and
PRIVACY_BOUNDARY. Audit the pending auth/public-private diff against Phase 1
acceptance criteria before changing it. If ownership is unclear ask code-mapper
for only auth.ts → route guards → API/storage/AppContext dependencies.
Record scoped decisions, fix demonstrated boundary defects, test synthetic
denial paths plus configured OAuth manually, then security-reviewer audits
the coherent auth diff. Do not assume inherited local work is committed.

## Remaining Phases
0. Harness checkpoint complete; pre-existing product test failure recorded.
1. Authentication + public/private boundary.
2. Durable database + private file persistence.
3. Job discovery + ATS truthfulness + freshness + dedupe.
4. Evidence-grounded qualification/ranking.
5. Resume provenance + tailoring + manual validation.
6. Proof packs + outreach + application answers.
7. Application tracking + outcome analytics.
8. Vercel-compatible architecture completion.
9. Security/privacy/release audit.
10. dev → main PR (separate authorization).
11. Google AI Studio integration/compatibility verification of merged main.
12. Vercel production deployment after main/Studio verification.
