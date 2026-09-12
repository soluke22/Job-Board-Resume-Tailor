# Productionization execution plan

## Project Goal
Truthful discovery and evidence-grounded career workflows with durable owner-only
private storage and a separate synthetic demo. GitHub is canonical.

## Current Branch
dev; Phase 5 started clean at freshly fetched dev == origin/dev ==
8882f7207060ec5182ede4e424963c8102863c94 (published Phase 4).
User requests coherent Phase 5 checkpoints and normal fast-forward origin/dev push.
No main, release PR, Studio or production deployment.

## Current Phase / Scope and Acceptance
Phase 5 — Resume provenance + tailoring + manual validation.
Acceptance: [Phase 5 matrix](phase-5-acceptance.md). Current certified assessment,
owner-resolved eligible evidence, exact-text claim ledger, deterministic identity,
manual invalidation/revalidation, safe regeneration, version history and final export.
No Phase 6. Parent owns writes; one narrow read-only security-reviewer.

## Current Status
Phase 5 conservative deterministic contract complete and published. Focused 11/11 and full
63/63 tests pass; initial release composition passes typecheck/build/harness/tests
and strict required-build privacy scan, zero findings. Final validation complete; implementation c00c5e2 published to origin/dev by normal
fast-forward. This documentation checkpoint records completion; verify clean/equal
fetched refs after publication. Phase 5 deterministic contract passes; live gates
remain pending. Live Gemini acceptance pending external configuration; no key exists
in process and only .env.example is present. No private records sent to a live model.
This is complete-statement certification; general semantic paraphrases require
reviewed atomic evidence before certification. Authenticated/deployed browser and
actual print pagination remain live gates, not fabricated success.

## Architecture Decisions
React/Vite + Express/Gemini, Better Auth owner sessions, Neon/Drizzle revisioned
owner workspace, private Blob/recovery intents and isolated synthetic demo retained.
Phase 5 adds strict reusable claim/basis types and a server provenance service.
No database migration: JSON-backed owner resume/version records retain the ledger.

## Completed Work
Phase 1 b8c9999: auth/session/origin/browser-memory contracts; live OAuth pending.
Phase 2 936a869/3154e0d: durable storage/private file/recovery/runtime contracts.
Phase 3 89b3596: canonical ATS/status/date/dedupe and unassessed discovery.
Phase 4 published at 8882f72: persisted-owner strict requirement/evidence matching,
deterministic qualification/coverage/strategy and current versioned assessment.
See earlier phase acceptance matrices for details and external limitations.

Phase 5: plan/generate/evaluate/validate/regenerate/export accept persisted jobId
and optional claimId only; browser facts and underlyingEvidence are rejected.
Current ASSESSED Phase 4 basis required for new certification; SKIP/hard blockers
excluded without an 8.0 threshold. Matched eligible IDs narrow model context.
Plans retain keep/omit requirement decisions, verified skills and project selection.
Gemini may select/reorder complete evidence statements and supported skill labels;
strict structured schemas prohibit identity, dates, invented IDs and certification.
MEDIUM thinking, 30-second request timeout, one request, no JSON extraction fallback.
Master supplies deterministic header/education and employment/project identity;
all source experiences are selectable with original employer/title/period links.
Master presentation is never evidence authority. Original bullet text is retained
when linked master material exists, without inheriting certification.

Claim ledger covers summary, experience/project bullets, skills and project tech.
Stable claim/artifact IDs, exact text and SHA-256 hash, source/generation mode,
multiple normalized evidence IDs, target requirement IDs, scope, validation hash,
time, algorithm and issues. States: verified/requires-review/manual-edit-unvalidated/
unsupported/rejected. Server checks eligible IDs, full statement support, explicit
technology labels and exact employment/project scope. Requirement targets need a
Phase 4 match to supporting evidence. No metric/verb/ownership inflation.

Browser manual edits clear approval immediately; server saves recompute actual hash.
Explicit checkpoint-and-validate compares actual text to current evidence. Restore
awaits validation; toggling inclusion preserves support but empty work is non-ready.
Regeneration uses only persisted claim/evidence envelope, validates before saving;
model failure preserves the previous version. Revision conflicts return 409 and
local in-flight edits are never overwritten by response adoption.

Readiness: DRAFT, NEEDS_VALIDATION, READY, STALE. Repository reads recheck assessment,
complete eligible-evidence and master/profile basis, identity and every enabled
claim. Legacy artifacts stay historical/stale. Real evaluation derives checks;
no optimistic summary/skills defaults. Edited, generated, regenerated, revalidated
and export-selected snapshots retain full text/ledger. Certified history is
immutable even through imports; ordinary saves cannot forge validation or basis.

Final export is fenced for plaintext/Markdown/LaTeX/JSON/app print/PDF. Server
rechecks persisted READY content, records the selected version and browser compares
it to visible content. Native print carries a draft label without app confirmation.
Cover letters remain visibly uncertified drafts. Page fit is a character-based
estimate, with print preview required; no verified single-page/ATS guarantee.
Print styling preserves identity header and isolates the printable artifact.

## Acceptance Criteria
For every enabled resume claim: exact current text linked to resolvable eligible
owner evidence, support within original scope, current assessment basis and explicit
validated hash. Any unresolved claim, changed identity, empty work or stale basis
blocks final export. Complete local gates pass; live semantic/rendering proofs
remain explicit external gates. Truth precedes relevance/readability/page fit.

## Tests Passed
Focused Phase 5 11/11; full npm test 63/63. Typecheck/build/harness and initial
release composition pass, strict required-build privacy zero findings.
Final npm run release:check passes typecheck/build/harness, 63/63 tests and strict
required-build privacy scan (zero findings). npm run privacy:scan, standalone
synthetic evidence validator, startup smoke 1/1 and git diff --check pass.
Existing client >500 kB warning remains (541.45 kB).

## Tests Failing / Security Review
No failures in latest focused suite. Full initial suite found protected route count
and legacy artifact metadata expectations; updated assertions retain denied HTTP
coverage and exact legacy text/identity preservation. Reviewer demonstrated negative
context detached by sentence splitting; fixed by complete approved statement reuse.
Reviewer demonstrated all-work-disabled and unsupported-skill client export gap;
fixed with broader invalidation and shared client/server fence regressions.
Reviewer found imports overwriting certified history; existing protected versions
now preserve stored originals through imports without normalization/upsert.
Import round-trip test also found review flags added to strict JD requirement shapes;
source records remain structurally intact while imported assessment stays stale.
All fixes have deterministic regression coverage. Reviewer directly rechecked all
three original reproductions and focused 11/11 suite: resolved; no remaining defect
in this focused boundary review.

## Known Blockers / Remaining Limitations
Live OAuth, Neon multi-connection transport/locking, private Blob CDN/faults and
Vercel/browser/network acceptance remain earlier external gates.
Live Gemini generation/schema/service acceptance awaits server-only configuration.
Exact complete-statement reuse proves preservation of approved evidence; it does
not independently establish truth of owner approval or semantic equivalence of
paraphrases. Longer evidence may need separate reviewed concise statements.
Project evidence requires exact persisted project ID/name sourceLocation;
ambiguous scope is withheld. No automatic years calculation or evidence backfill.
Page-fit heuristic cannot certify actual print/PDF pagination, font/device rendering
or ATS behavior. No document-format ecosystem rewrite. Export snapshot records
selected validated version, not OS/download completion. Native print is draft.
Certified versions persist until explicit job removal; no retention policy redesign.
Legacy gap interviews/cover letters/Phase 6 artifacts remain uncertified.

## External Configuration Needed
Server-only OWNER_EMAIL, Google ID/secret/callback, BETTER_AUTH_SECRET/URL,
Neon DATABASE_URL/schema, private BLOB_READ_WRITE_TOKEN and GEMINI_API_KEY.
Only synthetic candidate evidence authorized for a live Gemini smoke.
No secrets/private data logged or remote resources created.

## Files / Modules Currently Involved
server/resumeProvenance.ts, resumeRoutes.ts, server.ts structured adapter;
workspaceRepository certification/history/import and workspaceValidation;
shared provenance/index types; API/AppContext, editor/evidence/history/export/print
views and CSS; Phase 5 tests, auth/storage expectation updates and domain docs.

## Last Known Good Commit
Published Phase 4 baseline 8882f72. Locate Phase 5 checkpoint with git log -1 --
docs/exec-plans/active/productionization.md; publication verified by clean/equal
freshly fetched refs without a self-hash loop.

## Next Exact Step
Phase 6 — Proof packs + outreach + application answers.
Begin only on a new explicit continuation; this task stops after Phase 5 publication
and report. Live Phase 5 synthetic Gemini acceptance awaits external configuration.
Release audit precedes dev/main PR, merged-main AI Studio verification and final
Vercel production. Do not begin Phase 6 in this task.

## Remaining Phases
1. Authentication code-complete; live Google/browser acceptance pending.
2. Durable database/private files code-complete; live Neon/Blob acceptance pending.
3. Discovery/ATS deterministic contracts complete; live provider/Gemini gates pending.
4. Qualification/ranking deterministic contract complete; live semantics pending.
5. Conservative resume provenance/tailoring/manual validation implemented; live gates pending.
6. Proof packs + outreach + application answers.
7. Application tracking + outcome analytics.
8. Vercel-compatible architecture completion/live runtime acceptance.
9. Security/privacy/release audit.
10. dev -> main PR (separate authorization).
11. Google AI Studio verifies merged canonical main.
12. Vercel production after main/Studio verification.