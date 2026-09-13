# Phase 6 acceptance matrix

Scope: proof packs, recruiter outreach, referrals and application answers only.
Started clean on dev == freshly fetched origin/dev at b0be6da. Phase 4.1/5 preserved.

| Contract | Demonstrated baseline gap | Final evidence |
| --- | --- | --- |
| Proof source authority | server.ts accepts browser tailoredResume; AppContext falls back to master | Owner repository route tests reject browser resume/evidence; currentJob + inspectResume enforce READY |
| Claim linkage / coverage | Loose model IDs, only first eight work bullets; no summary/skills | Exact Phase 5 claim/envelope tests; 17 claims across two batches; disabled claims excluded |
| STAR / technical context | Required invented-completion-prone STAR; evidence not even sent | Complete linked statements only; unsupported context/action/result rejected; situation/task/result withheld pending atomic STAR evidence |
| Stale resume | No READY/current ledger check | Current READY ledger and basis required; stale/edited resume fixtures rejected |
| Recruiter evidence | Browser profile, no evidence validation | Owner-only matched eligible evidence; forgery and all nonapproved states rejected |
| Company / role grounding | Browser parsedJob, asks invented product excitement | Persisted company/title plus requirement excerpts; neutral language, no invented product facts |
| Fit language | Hardcoded React/TypeScript and directly qualified | APPLY FIRST close alignment; STRONG WITH GAP gaps; stretch transferable; SKIP reason override remains review |
| Referral relationship | Browser strings, direct fit without evidence | Explicit user name/label only; neutral unknown label; metadata stays server-side; no external sending |
| Question classification | Every question sent to model without routing | Six categories, sensitive/attestation precedence; model zero-call tests |
| Question retrieval | First five browser evidence records | Phase 4 retrieveEvidence per question, max eight positive-relevance records; late-bank fixture |
| Factual provenance | Loose evidence IDs, no statement validation | Strict selection IDs; server assembles complete eligible statements; model prose expansions rejected |
| Motivation | No explicit user-motivation boundary | Neutral alignment or verbatim explicit motivation, always NEEDS_REVIEW; no invented admiration |
| Deterministic profile | Model answers all fields | Persisted location/authorization/education assembled without Gemini; missing/review fields need input |
| Sensitive / attestations | No manual routing | Self-identification, health/mental health/pregnancy/age, legal attestations and unknowns remain empty/manual |
| Unknown IDs / model failure | Loose JSON extraction; no strict schema/support rejection | Strict Zod schemas and exact envelope support; malformed/invented/model failure preserves prior artifact |
| Stale assessment / evidence / profile | No basis fingerprint or currency | Assessment/evidence/JD/profile/algorithm fingerprints; proof includes exact resume hash; repository read checks |
| Structured output | JSON prompt plus extractCleanJson | Gemini responseJsonSchema, strict Zod/JSON.parse, MEDIUM, 30-second requests, no extraction fallback |
| Server persistence resolution | No owner repository reads; client saves output | Revisioned saveArtifact, conflict returns 409; adoption rejects in-flight local edits/session changes |
| Artifact state / readiness | No state; UI claims 100% grounded | Common DRAFT/NEEDS_REVIEW/READY/STALE; evidence/status UI and non-ready copy controls |
| Manual edits | Current views copy/display, no text editor; ordinary saves can forge artifacts | No artifact text editor added; ordinary saves cannot forge certification; changed content hashes require fresh generation |
| Limits | Model self-counts 300 characters / universal 150 words | Measured 300-char LinkedIn; original/explicit word/char constraints use stricter minimum; violations fail explicitly |
| Model minimization | Browser full evidence/profile, unrestricted question/contact strings | Only selected statement/technology/IDs and relevant requirement/match data; no full profile/history/contact/metadata; sensitive records withheld |

Acceptance: strict owner-resolved generation, shared eligibility and Phase 4.1 currency;
proofs cover exact enabled Phase 5 claims on current READY resume; no unsupported
facts/STAR outcomes/motivation/relationships; deterministic/manual question routing;
revisioned server persistence; hash invalidation and stale copy fences; synthetic
fixtures and all prior release gates. Live Gemini requires server configuration.

## Recovery checkpoint (2026-09-13)
Existing Phase 6 work was uncommitted at b0be6da, no Phase 6 commits. Shared
provenance, proof/message/answer service and structured routes: implemented but
untested. AppContext/API integration: partially implemented (misplaced insertion
repaired while preserving new operation). UI, focused tests and final docs: not
started. Live Gemini: blocked by absent configuration. Nothing reset/stashed.

## Verified implementation checkpoint
Phase 6 focused 14 grouped tests; Phase 4/4.1/5 regression 29 grouped tests.
Earlier checkpoint focused 42/42 and typecheck/build pass. Initial full suite
81/82: sole mismatch was newly explicit DRAFT metadata on preserved legacy artifacts;
content-preservation and DRAFT assertions now pass in focused Phase 2 suite.
Reviewer original pregnancy/bipolar/age question leakage resolved with zero-call
regressions; unnecessary evidence metadata removed and regression added.
Final full npm test 83/83 and release composition pass; reviewer directly rechecked
both sensitive-data reproductions as resolved, no remaining demonstrated defect.

## Conservative limitations and external gates
Certified factual prose reuses complete approved statements; arbitrary paraphrases
are withheld. STAR situation/task/result require reviewed atomic component support
not available in the current evidence model, so are explicitly not documented.
Motivation, overrides and sensitive/attestation responses stay NEEDS_REVIEW/manual;
there is no review-to-attestation button or external sending. Manual artifact edits
require fresh server generation; no semantic manual-edit validator was invented.
Classifier/retrieval are conservative lexical contracts, not exhaustive semantic
classification or support discovery. Authenticated/deployed browser and live
Gemini acceptance remain external gates. Only .env.example; GEMINI_API_KEY absent.

## Completion gate (2026-09-13)
All requested Phase 6 areas: complete and tested within the documented conservative
contract. Live Gemini and authenticated/deployed browser: blocked by external
configuration, not claimed successful. Phase 6 focused 14/14; Phase 4/4.1/5 29/29
within complete npm test 83/83. Typecheck, build, harness, standalone privacy (zero),
standalone synthetic evidence ID validator, release:check (including strict required
build privacy zero), startup smoke 1/1 and git diff --check pass. Chunk warning
546.37 kB remains. Source changes include ATS refresh; artifact edits immediately
invalidate local copy as well as server hashes. No prior Phase 5 export gate weakened.
Scoped commit and normal dev publication follow this validated checkpoint.
