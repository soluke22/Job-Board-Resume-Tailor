# Productionization execution plan

## Project Goal
Truthful discovery and evidence-grounded career workflows with durable owner-only
private storage and a separate synthetic demo. GitHub is canonical.

## Current Branch
dev only. Phase 3 started from clean 3154e0d6a529346b90bd834cc29c8ef63d911811,
equal to freshly fetched origin/dev. User authorizes coherent validated Phase 3
checkpoint(s) and normal fast-forward origin/dev push. No main change, release PR,
Google AI Studio, production Vercel deployment or Phase 4 implementation.

## Current Phase
Phase 3 — Job discovery + ATS truthfulness + freshness + dedupe.
Deterministic code-complete; all final local gates pass. Checkpoint publication gate
is normal fast-forward push plus clean/equal-ref verification at handoff.
[Phase 3 acceptance](phase-3-acceptance.md) preserves the before-edit
matrix, after-change evidence, provider review and remaining live limitations.
Phase 1/2 code acceptance remains intact; their external configuration gates remain.

## Current Status
Focused Phase 3 contracts pass seven grouped tests; complete suite passes 40/40.
Typecheck, build, harness, privacy scan (zero findings) and diff check passed.
Final release composition passes, including all 40 tests and strict public-build
privacy scan (zero findings). Startup smoke passes 1/1. Publish the validated
checkpoint normally and verify clean dev == fetched origin/dev at handoff.
Live Gemini not run: key absent. Application provider smoke not run; official
provider docs/demo response reviewed separately. No job applications performed.

## Architecture Decisions
React/Vite + Express/Gemini retained. Better Auth database Google/owner sessions,
Neon/Drizzle owner-scoped revisioned workspace storage, private Blob and recovery
intents retained. No production memory fallback, no stale-revision auto-merge.
Public synthetic demo stays independent of private services; auth/service loss
clears private browser memory. Node persistent pools reuse until shutdown;
serverless request-local pools cannot reopen after response cleanup.

Discovery now retains search data separately from exact provider content. Supported
public APIs: Ashby published board feed, Greenhouse exact public Job Board post,
Lever public v0 posting (global/EU). Arbitrary pages use shared bounded DNS-pinned
safe fetch; fixed provider APIs disallow redirects and bound JSON/timeouts.
Shared identity/metadata merge returns existing-history refreshes separately from
new leads. No discovery persistence redesign or automatic history overwrite.

## Completed Work
Phase 1: deterministic owner/auth/session/origin/client lifecycle acceptance and
logout storage-error fix at b8c9999. Live Google OAuth pending.
Phase 2: scalar/history replacement, transaction/revision/restart/owner/import,
durable Blob recovery/reconciliation/private downloads, migration and terminal
DB lifecycle fixes. Last published Phase 2 checkpoint 3154e0d; prior 936a869.
Detailed acceptance is preserved in [Phase 1](phase-1-acceptance.md) and
[Phase 2](phase-2-acceptance.md); no tests or validators weakened.

Phase 3: board-only and fabricated successful defaults removed; exact posting
verification, unsupported provider status and generic reachability uncertainty.
Canonical JD/provider metadata, grounding source URLs/queries/aliases and explicit
date provenance retained. Local observation/update/publication dates separated;
UNKNOWN freshness added. Deterministic ATS/URL/conservative fallback identity
shared by client/server; all application statuses/history/attachments retained on
canonical refresh. New discovery/pasted jobs explicitly unassessed, scores absent;
runtime schema rejects fake scores in that state. Existing manually requested
analysis merely updates the assessment-state handoff; its algorithm is unchanged
and not certified as Phase 4. /api/fetch-job-url uses the same safe URL boundary.

## Acceptance Criteria
Search-found, exact verified, unknown, removed, unlisted, unsupported, unknown
publication, first-seen observation, duplicate/history match and unassessed fit are
distinct without fabricated discovery defaults. No snippets become authoritative
requirements/responsibilities/compensation/dates. Provider content becomes the
downstream JD; missing content stays unavailable. Classification does not score.

LISTED requires exact positive public-post evidence. Ashby isListed false is
UNLISTED, not closed. Successful feed absence/exact 404 is NOT_LISTED without
a particular closure reason. Errors/unexpected/board-only/generic 200 are UNKNOWN.
Workday, SmartRecruiters and Recruitee are UNSUPPORTED.
Ashby last-published, Greenhouse first_published/update, and optional numeric Lever
creation semantics are labeled; firstSeenAt and lastVerifiedAt are CareerOS-local.

Dedupe: supported provider+board+ID, normalized canonical URL, conservative known
company/title/location fallback without conflicting stronger identities.
Fragments/tracking/trailing slashes/Greenhouse host aliases normalize; distinct IDs
never title-merge. Redirect/canonical aliases require exact ATS verification.
ExistingJobs is the complete loaded workspace; matches return refreshedJobs, not
new recommendations. Metadata-only refresh preserves ID, firstSeenAt, lifecycle,
notes, assessments and every attachment. Removed leads are not new active results.

One Gemini request per invocation; queryBudget bounds discovery requests (1-10).
discoveryRequestsUsed is actual invocation count; queryBudgetUsed is a labeled
legacy alias, not a claim to know internal Google search count. Custom queries are
used as suggestions and actual SDK query strings retained when supplied.
Only allowlisted configured search preferences, not identity/contact/evidence,
reach the discovery prompt.

Safe fetch: HTTP(S), no credentials/nonstandard ports, local/private/link-local/
metadata/internal destinations denied, DNS answers screened and socket-pinned.
Each redirect revalidated (four max), total 8-second DNS/redirect/body deadline,
text content only and streamed 1 MiB cap. Provider JSON has 8 seconds/4 MiB and
no redirects. Node scalar/all-address lookup callback forms are both tested.

## Tests Passed
Focused: node --import tsx --test tests/phase-3-discovery.test.ts (7/7).
Complete npm test (40/40); Phase 1/2 fixtures retained.
npm run typecheck; npm run build; npm run harness:check; npm run privacy:scan
(zero findings, public build included); git diff --check.
Client build 536.18 kB, existing >500 kB chunk warning remains.
Final npm run release:check passes typecheck/build/harness, 40/40 tests and strict
required-build privacy scan (zero findings). Phase 2 startup smoke passes 1/1.

## Tests Failing
None in completed gates. Initial streamed-size mock exposed nonterminal rejection;
explicit size rejection fixed. Reviewer Node lookup-shape defect fixed and both
callback forms now pass. Synthetic provider/auth/database failures are fixtures.

## Security Review
Requested read-only docs-researcher (Luna Medium) verified official public APIs
before semantic changes; [provider contracts](phase-3-provider-contracts.md) records
sources and timestamp/compensation limitations.
Requested read-only security-reviewer (Sol High) audited only meaningful safe-fetch
boundary changes. Demonstrated P2: Node all=true lookup requires address array,
scalar callback made real hostname fetch fail. Fixed both shapes; parent fixtures
verify screened/pinned result. No additional demonstrated SSRF bypass found.
Independent specialist recheck unavailable due usage limit; no success claimed.
No mapper/triager or overlapping writers; parent owns all edits.

## Known Blockers / Remaining Limitations
Live Google OAuth/cookies/authenticated browser, Neon multi-connection transport/
locking and private Blob CDN/abort/late-put acceptance remain external gates.
PGlite is serialized single-connection; Blob faults are synthetic, not live proofs.
Recovery remains owner-triggered bounded retry, not an automatic sweeper guarantee.
Phase 3 live application provider/Gemini smoke remains pending, not CI dependency.
Gemini key absent; only .env.example present. No secret or private records logged.
Generic aliases lacking supported authoritative identity remain uncertain/separate.
Deleted records or history outside loaded workspace cannot be deduplicated.
Existing legacy assessments are preserved, not retrospectively certified;
canonical refresh does not implement Phase 4 score invalidation/re-ranking.
Provider HTML remains untrusted text, canonical structured requirements parsing
deferred. Optional Lever public createdAt is labeled creation, not guaranteed
publication; public feeds do not explain why an absent posting disappeared.
IPv6 policy is conservative; deployed egress/network behavior needs live acceptance.
Generic closure detection is only explicit job-specific wording on unchanged URL.
No full security audit, Workday scraper, ranking algorithm or tailoring work added.

## External Configuration Needed
Server-only OWNER_EMAIL, Google ID/secret/callback, BETTER_AUTH_SECRET,
BETTER_AUTH_URL, Neon DATABASE_URL/schema, private BLOB_READ_WRITE_TOKEN;
GEMINI_API_KEY for live discovery. No resources created, migrations/deployments run
remotely or private candidate material sent in a live request.

## Files / Modules Currently Involved
server/atsAdapters.ts, server/discovery.ts, server/safeFetch.ts,
server/searchEngine.ts, discovery/verification/fetch portions of server.ts;
JobRecord types/runtime jobSchema, AppContext discovery/manual/verification handoff,
shared src/utils/jobIdentity.ts, discovery UI/fit analytics;
tests/phase-3-discovery.test.ts; JOB_SEARCH_PIPELINE, TESTING, ARCHITECTURE,
Phase 3 matrix/provider review and this plan.

## Last Known Good Commit
Published Phase 2 baseline: 3154e0d. Locate Phase 3 checkpoint after publication with
git log -1 -- docs/exec-plans/active/productionization.md (no self-hash loop).
Verify fetched dev == origin/dev and clean working tree after normal push.

## Next Exact Step
Phase 4 — Evidence-grounded qualification/ranking.
Begin only on a new explicit continuation after Phase 3 publication verification.
This task stops at the Phase 3 final report; do not implement Phase 4.
Release audit precedes dev/main PR, merged-main Google AI Studio verification
and final Vercel production.

## Remaining Phases
1. Authentication code-complete; live Google/cookie/browser acceptance pending.
2. Durable database/private files code-complete; live Neon/Blob acceptance pending.
3. Discovery/ATS/freshness/dedupe deterministic code-complete; live smoke pending.
4. Evidence-grounded qualification/ranking.
5. Resume provenance + tailoring + manual validation.
6. Proof packs + outreach + application answers.
7. Application tracking + outcome analytics.
8. Vercel-compatible architecture completion/live runtime acceptance.
9. Security/privacy/release audit.
10. dev -> main PR (separate authorization).
11. Google AI Studio verifies merged canonical main.
12. Vercel production after main/Studio verification.
