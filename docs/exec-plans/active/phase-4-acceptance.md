# Phase 4 acceptance

Baseline: clean dev 89b3596, fetched origin/dev equal. Scope is qualification/ranking only; no Phase 5.

| Requirement | Current behavior | Evidence | Status | Required fix |
| --- | --- | --- | --- | --- |
| JD source eligibility | Any caller text | analyze-job | Fail | Persisted canonical or explicit user JD |
| Requirement extraction/provenance | Unvalidated prose JSON, no spans | analyze-job | Fail | Strict schemas, exact excerpts, stable IDs |
| Role family/modifiers | Old families | analyze-job | Fail | Canonical five families |
| Evidence eligibility/server resolution | Caller flags, most states accepted | analyze-job | Fail | Owner repository, enabled verified only |
| Retrieval | Whole bank and project text | match-evidence | Fail | Deterministic bounded relevance |
| Matching/unknown IDs/adjacency | Unvalidated references | match-evidence | Fail | Complete coverage and supplied IDs only |
| Blockers/constraint fit | Candidate title heuristics | searchEngine | Fail | Explicit configured policy and facts |
| Qualification/coverage/priority | Model arithmetic, 8 threshold | analyze-job | Fail | Documented deterministic algorithm |
| Explanation | Model prose | analyze-job | Fail | Derive from validated matches |
| Staleness/cache/legacy migration | No certification fingerprints | JobRecord | Fail | Versioned persisted metadata, stale history |
| Invalid model output/injection | JSON.parse only | routes | Fail | Strict schema and fail closed |
| Gemini context minimization | Full bank, projects | routes | Fail | Relevant evidence, no contact metadata |

Acceptance: focused contract tests and all existing release gates; live synthetic Gemini only if credentials exist. Final status and limitations recorded below after validation.

## After-change evidence

| Requirement | Current behavior | Evidence | Status | Required fix |
| --- | --- | --- | --- | --- |
| JD source eligibility | Canonical AVAILABLE or explicit user source; snippets/fetched-only insufficient | assessmentSource / source test | Pass | None |
| Requirement extraction | Strict structured facts/hard/preferred/responsibility excerpts | extractionSchema / provenance test | Pass contract; live Unverified | Synthetic live semantic smoke |
| Requirement provenance | Exact substring offsets and hashed kind/excerpt IDs | sourceRequirements | Pass | None |
| Role-family classification | Canonical five families | familySchema / family independence test | Pass contract; live Unverified | Live semantic review |
| Modifiers | Existing vocabulary, strategy only | modifierSchema / scoring | Pass contract | Live semantic review |
| Evidence eligibility | Enabled verified, no pending review; repository owner snapshot | eligibility tests | Pass | None |
| Server-side evidence resolution | Request accepts jobId only; server read supplies profile/evidence | real repository/handler test | Pass | None |
| Evidence retrieval | Positive exact/adjacent relevance, per-requirement round-robin <=32 | order/bound/adjacency test | Pass | Limited dictionary documented |
| Requirement matching | Every requirement once, valid support IDs | validateMatches test | Pass contract; live Unverified | Live semantics |
| Unknown evidence IDs | Rejected, including cross-owner/disabled IDs | matching/handler tests | Pass | None |
| Adjacency versus direct | Strong requires direct; Moderate/Weak label adjacency | matching test | Pass contract | Semantic truth needs review |
| Deterministic blockers | Explicit policy/facts; old title heuristics removed | constraint tests | Pass supported syntax | Ambiguous language unknown |
| Constraint fit | Categorical blockers/preferences/unknown, comparable salary only | constraints test | Pass | No numeric constraint score introduced |
| Qualification fit | Fixed group arithmetic, no family constants | arithmetic/hard-gap tests | Pass | None |
| Evidence coverage | Conservative coefficients, no unapproved support | arithmetic/eligibility tests | Pass | None |
| Application priority | Separate strategy buckets and recommendation | score/constraint tests | Pass | None |
| Explanation | Derived requirement matches/gaps/constraints; triage UI exposes apply reason | scoreAssessment / UI diff | Pass contract; browser Unverified | Authenticated live UI pending |
| Stale invalidation | JD/evidence/profile/version/status/compensation/freshness fingerprints; stale history hidden from current triage | fingerprints / real repo tests | Pass | Client invalidation conservative |
| Legacy migration | Private legacy STALE, derived deprecated fields; no independent model scoring | repository reads / deterministic fit | Pass | Later artifact provenance deferred |
| Invalid model output | Strict schemas, unknown refs/omitted matches rejected, no fake success | validation/injection tests | Pass | None |
| Gemini context minimization | Relevant approved evidence only, persisted-profile redaction, IDs preserved | orchestrator test | Pass | Live transport unverified |

## Gate results and limits

Focused contracts: 12/12. Complete suite: 52/52, all Phase 1–3 retained.
Final npm run release:check passes typecheck/build/harness, all 52 tests and strict
required-build privacy scan (zero findings). npm run privacy:scan also passes.
Existing 537.21 kB client chunk warning remains. Startup smoke passes 1/1.
Standalone evidence validator passes on an owner-scoped synthetic fixture;
git diff --check passes. Initial plan-heading harness failure fixed without
weakening the checker; final composition passes.
Narrow reviewer demonstrated display-field certification forgery and omitted
freshness invalidation. Both fixed; real repo and fingerprint regressions pass.
Read-only reviewer reran both original reproductions and confirmed both resolved.
Official SDK structured-output syntax reviewed by read-only docs-researcher;
no key in environment or .env, so live Gemini semantic acceptance pending external
configuration. No private candidate data sent to a live model.
Exact excerpts prove source presence, not perfect extraction/semantic support.
Dictionary retrieval and explicit text constraint parsing remain bounded; ambiguous
facts stay unknown. Authenticated browser/OAuth/Neon/Blob/deployment remain external.
No Phase 5 started; gap interview/artifact provenance is not certified here.

Result: deterministic Phase 4 contract Pass; live Gemini semantic acceptance
pending external configuration. Normal checkpoint publication/equal fetched refs
is verified at handoff.
