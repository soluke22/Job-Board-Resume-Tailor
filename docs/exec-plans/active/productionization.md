# Productionization execution plan

## Project Goal
Truthful discovery and evidence-grounded career workflows with durable owner-only
private storage and a separate synthetic demo. GitHub is canonical.

## Current Branch
Phase 4 starts clean at 89b3596bdf442cf22b35c670c86791253cd9fe31, verified equal
to freshly fetched origin/dev. User authorizes Phase 4 checkpoint and normal
fast-forward origin/dev push. dev only; no main, release PR, Studio, production
Vercel or Phase 5 work.

## Current Phase / Scope and Acceptance
Phase 4 — Evidence-grounded qualification/ranking.
Actual canonical or explicit user JD -> source excerpts -> owner-approved evidence
-> bounded retrieval -> validated semantic matches -> deterministic arithmetic
-> explainable constraint-aware recommendation. Gemini cannot supply final scores.
Acceptance matrix: [Phase 4](phase-4-acceptance.md). Completion gate is focused/full
tests, typecheck/build/harness/privacy/evidence/release/startup/diff checks plus
normal checkpoint publication. Live Gemini is a separate external acceptance gate.

## Current Status
Phase 4 deterministic assessment contract verified locally; final publication
verification follows checkpoint. Live Gemini semantic acceptance pending external
configuration: GEMINI_API_KEY absent (environment and only .env.example).
No real private evidence sent to a live model. No applications performed.

## Architecture Decisions
React/Vite + Express/Gemini, Better Auth owner sessions, Neon/Drizzle revisioned
owner workspace, private Blob/recovery intents and isolated synthetic demo retained.
## Completed Work
Phase 1 b8c9999: auth/session/origin/browser-memory contracts; live OAuth pending.
Phase 2 936a869/3154e0d: durable owner storage, replacement/restart/rollback,
private files/recovery and terminal database lifecycle; live Neon/Blob pending.
Phase 3 89b3596: exact ATS canonical content/status/date provenance, safe bounded
fetch, conservative dedupe/history refresh and explicit unassessed discovery.
See [Phase 1](phase-1-acceptance.md), [Phase 2](phase-2-acceptance.md),
[Phase 3](phase-3-acceptance.md) and [provider contracts](phase-3-provider-contracts.md).

Phase 4: analyze-job/match-evidence accept jobId only and resolve owner repository
JD/evidence/SearchProfile. Canonical AVAILABLE or explicit user-provided JD is
required; generic URL fetch alone/snippets fail insufficient-JD. Shared strict
Zod extraction/match schemas use SDK structured output, separate system instructions,
MEDIUM thinking, 30-second timeout per request and no fabricated fallback/retry.
Exact excerpts must occur in JD; stable hashed requirement IDs retain offsets.
Canonical five families/modifiers; role classification is not qualification.
Enabled verified owner evidence only, additionally excluding requiresUserReview.
All other states and disabled/import assertions/project/skill free text cannot score.
Deterministic lexical/adjacency relevance plus per-requirement round-robin retrieves
at most 32 approved records independent of bank order. Unknown evidence/requirement
IDs, incomplete matching and Strong adjacency fail validation; support IDs deduplicate.
Contact/identity free text is redacted against persisted profile, IDs preserved.

## Scoring Algorithm / Strategy
phase4-v1: average coefficients per present requirement group; weights hard .80,
preferred .15, responsibilities .05 renormalized over present groups. Multiply by
10 and round to one decimal. Qualification coefficients Strong 1, Moderate .70,
Weak .25, Missing 0; coverage 1/.50/.10/0. Each score capped at 5.9 when its
hard-group average < .50. Requirements encode actual years/seniority/domain gaps;
no candidate years inferred, no title/family numeric constants.
Constraints remain categorical and separate. Configured employment, relocation,
clearance, required onsite/location/frequency, comparable authoritative minimum
salary, company and literal title exclusions may block. Known hiring-process,
family/modifier/seniority and target salary preferences affect strategy only.
Unknown salary/location/process is unknown. No inherited Java/Python/Staff blockers.
SKIP: real blocker, NOT_LISTED posting or qualification < 5. APPLY FIRST:
qualification >= 8.5, coverage >= 7.5, no concerns. Otherwise STRONG WITH GAP:
qualification >= 7; CALIBRATED STRETCH: >= 5. Recommendation SKIP agrees;
APPLY for >= 7 without concerns, otherwise SELECTIVE_APPLY. Uncertain posting/old
publication lowers strategy only. All explanations derive from validated matches,
gaps or deterministic constraints. No 8.0 apply gate.

## Invalidation / Legacy Migration
Metadata: JD/source SHA-256, sorted eligible semantic-evidence fingerprint,
SearchProfile plus posting/compensation/effective freshness fingerprint, algorithm
version and timestamp. Repository reads mark legacy/changed assessments STALE,
retain history, and unchanged certified metadata reuses without Gemini. Ordinary
client saves cannot certify changed assessments or derived display fields.
Assessment commits use original revision; concurrent updates fail 409. Local edits
are never overwritten by assessment adoption; reload required on in-flight edits.
UI hides stale scores and shows reassess notice. Evidence/profile edits conservatively
invalidate; canonical refresh/direct job source/status/compensation edits invalidate.
Removed process-local cache and unused candidate blocker heuristics. Deprecated
initial/tailored scores derive from qualification; UI displays qualification/coverage.
New priority STRONG WITH GAP; old strings remain only historical compatibility.
Legacy verdict/canTailor derive from recommendation. Automatic interview generation
removed from assessment. Existing deeper gap/resume/artifact provenance is Phase 5/6,
not certified by Phase 4.

## Acceptance Criteria
Strict owner-source/evidence contracts, complete supplied-requirement matching,
deterministic arithmetic and independent constraint/priority/recommendation,
auditable explanations, stale history and safe persisted reuse. All available
local gates must pass; no live semantic/provider acceptance fabricated.

## Tests Passed
Focused Phase 4: 12 grouped tests. Full npm test: 52/52 including all Phase 1–3.
Typecheck, build, harness and strict required-build privacy scan: pass, zero findings.
Final npm run release:check passes all 52 tests, typecheck/build/harness and strict
required-build privacy scan (zero findings). npm run privacy:scan also passes.
Standalone synthetic evidence validator, startup smoke (1/1) and diff check pass.
Existing client >500 kB chunk warning remains (537.21 kB).

## Tests Failing / Security Review
No remaining failures in completed checks. Initial retrieval fixture accidentally
labeled unrelated records React; corrected synthetic fixture. Final diff whitespace
cleaned. Initial rewritten plan omitted exact required headings; restored them,
final harness/release composition passes without checker changes.
Narrow read-only docs-researcher verified official structured-output syntax
and Zod dialect normalization. Narrow read-only security-reviewer demonstrated
omitted top-level certification fields and omitted freshness fingerprint; both fixed
with repository/fingerprint regression tests. Reviewer rechecked both original
reproductions and confirmed resolved. Parent owns writes; no mapper/triager.

## Known Blockers / Remaining Limitations
Live Google OAuth/authenticated browser, Neon multi-connection transport/locking,
private Blob CDN/abort/late-put and deployed network/runtime remain external gates.
PGlite uses a serialized connection; Blob fault fixtures are not live proofs.
Live Gemini 3.8/schema acceptance and semantic completeness/correctness pending.
Exact excerpts prove source presence, not complete interpretation or semantic truth.
Dictionary retrieval may miss synonyms; bounded retrieval may exclude some relevant
records in very large banks. Constraint text parsing handles explicit interpretable
facts conservatively; ambiguous frequency/location remains unknown. Salary only
comparable annual USD, no unsupported currency/hour conversion. Client invalidation
may reassess after irrelevant evidence/profile edits; no targeted dependency graph.
No claim-level project/skill/resume provenance redesign or interview certification.
Prior artifacts/history preserved; no Phase 5 work or remote deployment/migration.

## External Configuration Needed
Server-only OWNER_EMAIL, Google ID/secret/callback, BETTER_AUTH_SECRET/URL,
Neon DATABASE_URL/schema, private BLOB_READ_WRITE_TOKEN and GEMINI_API_KEY.
No secrets/private records logged; no remote resources created.

## Files / Modules Currently Involved
server/assessment.ts, assessmentRoutes.ts, server.ts assessment SDK adapter,
workspaceRepository certification/read invalidation, workspaceValidation schemas,
searchEngine freshness; shared assessment/index types; AppContext/API and triage
UI/analytics/refresh handoff; phase-4-assessment tests and domain docs.

## Last Known Good Commit
Baseline published Phase 3: 89b3596. Locate Phase 4 checkpoint with git log -1 --
docs/exec-plans/active/productionization.md; normal push then clean/equal fetched
refs verify publication without self-hash loop.

## Next Exact Step
Phase 5 — Resume provenance + tailoring + manual validation.
Begin only on a new explicit continuation; this task stops after Phase 4 report.
Live Phase 4 synthetic Gemini semantic acceptance also awaits configuration.
Release audit precedes dev/main PR, merged-main Google AI Studio verification
and final Vercel production.

## Remaining Phases
1. Authentication code-complete; live Google/cookie/browser acceptance pending.
2. Durable database/private files code-complete; live Neon/Blob acceptance pending.
3. Discovery/ATS/freshness/dedupe code-complete; live provider/Gemini smoke pending.
4. Qualification/ranking deterministic contract complete; live semantics pending.
5. Resume provenance + tailoring + manual validation.
6. Proof packs + outreach + application answers.
7. Application tracking + outcome analytics.
8. Vercel-compatible architecture completion/live runtime acceptance.
9. Security/privacy/release audit.
10. dev -> main PR (separate authorization).
11. Google AI Studio verifies merged canonical main.
12. Vercel production after main/Studio verification.
