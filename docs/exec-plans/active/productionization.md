# Productionization execution plan
## Project Goal
Truthful discovery and evidence-grounded career workflows with durable owner-only
private storage and a separate synthetic demo. GitHub remains canonical.

## Current Branch
dev; history: main 18bde7f → older remote harness 1a620d6 → Phase 0 b12fd5b
→ inherited application checkpoint 41a04f8 → stale fixture correction 0828816
→ reconciliation-state checkpoint (latest commit touching this plan).
origin/dev had no remote-only work after fetch. Publish by normal fast-forward;
no rewrite, merge, PR or main mutation. Verify origin/dev=dev after publishing.

## Current Phase
Phase 0 complete; pre-Phase-1 reconciliation complete. Phase 1 has not begun.
Next: Authentication + public/private boundary acceptance audit of inherited code.

## Current Status
All 46 inherited files individually classified and preserved in 41a04f8;
required npm lock and Drizzle metadata included, no user work discarded.
Original failing test preserved there; only stale fixtures corrected in 0828816.
Reconciliation checkpoint 9df3b71 committed docs/router state. Working tree was
verified clean; normal push succeeded and fetch confirmed origin/dev=dev.
This publication receipt is a final docs-only checkpoint, also fast-forward pushed.
Full per-file disposition and remote classification: DEV_RECONCILIATION.md.

## Architecture Decisions
React/Vite + Express/Gemini retained. Inherited Better Auth, Neon/Drizzle, private
Blob and ESM/local/preview adapters are now committed, not certified complete.
Use package-lock.json/npm ci; older bun.lock retained as historical work until
explicit package-manager cleanup. Next.js remains conditional.
New Phase 0 .agents/.codex harness authoritative; old generic roles/manual skills
remain only in history. Sol Medium parent; optional narrow read-only helpers.
Release audit → dev/main PR → merged main → AI Studio verification → Vercel.

## Completed Work
Phase 0 harness b12fd5b unchanged. Remote older harness history fully retained.
Inherited local application work checkpointed separately after classification.
Stale partial persistence fixtures corrected without changing application schemas,
repository logic, authentication behavior or weakening release checks.
No Phases 1–12 implementation started during reconciliation.

## Acceptance Criteria
Reconciliation: no lost remote/local work, understood history, scoped checkpoints,
strict validators retained, deterministic checks pass, clean dev and normal push.
Phase 1: configured Google OAuth, verified owner identity, server ownership and
session denial/revocation/outages, empty private setup and coherent isolated UX.

## Tests Passed
2026-09-12: typecheck/build; six node:test tests including durable workspace;
harness integrity and evidence/privacy positive/negative fixtures;
strict source/public-artifact privacy scan zero current-rule findings;
evidence CLI on synthetic fixture; release:check passes.
Build retains 531.60 kB client chunk warning. npm ls --depth=0 passes.
Six routes previously independently reviewed; five configuration TOMLs parse.

## Tests Failing
None in final deterministic suite. Historical failure reproduced before changes:
tests/workspace.test.ts line 26 initial repo.save → workspaceRepository.ts safeParse
rejects incomplete profile/evidence/job/fit/version records before DB mutation.
Later import/job/search fixtures were incomplete too. Complete synthetic fixtures
now exercise intended record contract; invalid field/partial/duplicate/owner cases
still rejected. This was inherited test/schema drift, not proven product defect.

## Known Blockers
Live OAuth, Neon, Blob, client lifecycle/UX and hosting acceptance unverified.
ATS truthfulness/freshness/dedupe, semantic evidence and SSRF gaps remain later work.
ID integrity/static privacy triage do not prove semantic support or complete safety.
Bundled skill quick_validate unavailable (PyYAML absent); repo checks pass.

## External Configuration Needed
Server-only Google credentials/callback, owner identity, Better Auth secret/origin,
Neon URL, private Blob token and Gemini key. No remote migration/deploy run.

## Files / Modules Currently Involved
See DEV_RECONCILIATION.md for every inherited path and rationale. Phase 1 starts
server/auth.ts → server.ts/workspaceRoutes/privateFiles guards → API/storage/
AppContext/AuthModal/setup. Existing DB/schema code reviewed only as dependency.

## Last Known Good Commit
9df3b71c33d34d3764177948a3477d992ecfdec0: validated reconciliation checkpoint;
final deterministic validation recorded above. Final state/docs checkpoint is
latest commit touching this plan: git log -1 -- docs/exec-plans/active/productionization.md.
Compare git rev-parse dev origin/dev after fetch; no self-referential hash needed.

## Next Exact Step
On clean dev confirm HEAD equals origin/dev, read workspace-security/SKILL.md and
PRIVACY_BOUNDARY, then audit inherited auth.ts and its route/client boundaries
against Phase 1 acceptance before changing code. Verify configured Google OAuth
and synthetic denial/revocation/outage/public-private UX; use code-mapper only
if ownership unclear, then security-reviewer on the scoped boundary. Do not
assume preserved inherited authentication is Phase 1 complete. Record scoped
findings and acceptance criteria before implementing any demonstrated fixes.

## Remaining Phases
1. Authentication + public/private boundary acceptance and demonstrated fixes.
2. Durable database + private file persistence acceptance.
3. Job discovery + ATS truthfulness + freshness + dedupe.
4. Evidence-grounded qualification/ranking.
5. Resume provenance + tailoring + manual validation.
6. Proof packs + outreach + application answers.
7. Application tracking + outcome analytics.
8. Vercel-compatible architecture completion.
9. Security/privacy/release audit.
10. dev → main PR (separate authorization).
11. Google AI Studio verifies merged canonical main.
12. Vercel production after main/Studio verification.
