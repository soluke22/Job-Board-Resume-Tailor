# Phase 3 acceptance matrix

Scope: discovery, exact ATS verification, canonical content, dates, dedupe and
unassessed records only. Phase 4 scoring is explicitly excluded.

## Before-edit baseline

| Requirement | Current behavior | Evidence | Status | Required fix |
| --- | --- | --- | --- | --- |
| Ashby exact posting | Board-only succeeds; missing isListed defaults true | atsAdapters.ts | Fail | Require exact identity and explicit listing flag |
| Greenhouse exact posting | Failed exact request falls through to board success | atsAdapters.ts | Fail | Exact endpoint only; 404 removed; other errors unknown |
| Lever exact posting | Exact endpoint; fabricated employment/location defaults | atsAdapters.ts | Fail | Preserve provider fields only |
| Unsupported ATS | Generic adapter fallback | atsAdapters.ts | Fail | UNSUPPORTED |
| Generic page | HTTP 200 implies listed | atsAdapters.ts | Fail | Reachability UNKNOWN |
| Canonical JD | Search summary only | server.ts | Fail | Provider content separate from discovery |
| Search grounding | Grounding URLs discarded | server.ts | Fail | Retain source URLs and queries |
| Verification exceptions | LISTED initialized before verification | server.ts | Fail | UNKNOWN default |
| UNLISTED | Ashby flag partly supported | atsAdapters.ts | Fail | Explicit false, not closed |
| Removed posting | Board-only and generic evidence ambiguous | atsAdapters.ts | Fail | Require authoritative exact absence |
| Publication | Recent becomes now | server.ts | Fail | Provider publication only |
| First seen | Local timestamp | server.ts | Pass | Preserve on rediscovery |
| Updated date | Provider stored but not used in discovery | atsAdapters.ts | Fail | Keep independent |
| Freshness | Falls back to first seen | searchEngine.ts | Fail | UNKNOWN publication band |
| Batch dedupe | Seen set never extended | server.ts | Fail | Shared deterministic identity |
| Workspace dedupe | Company/title only | server.ts | Fail | ATS identity then URL then conservative fallback |
| Application history | Skips company/title without metadata refresh | server.ts, AppContext.tsx | Fail | Preserve history during canonical refresh |
| Missing URL | jobs.example.com default | server.ts | Fail | Reject URL-less lead; never fabricate |
| Query budget | Always reports 1 search query | server.ts | Fail | Define discovery-request count and validate budget |
| Search profile | Hardcoded candidate assumptions | server.ts | Fail | Allowlisted configured preferences, custom queries |
| URL fetch safety | Arbitrary URL follows redirects | atsAdapters.ts | Fail | Shared bounded DNS-pinned safe fetch |
| Unassessed fit | Family assigns constant scores | server.ts | Fail | Explicit unassessed, no scores |

## After implementation

Evidence suite: tests/phase-3-discovery.test.ts (seven grouped deterministic tests,
many explicit scenario assertions). Complete suite currently 40/40. No live board
availability or credentials are required. See phase-3-provider-contracts.md for
the official API review performed before semantic changes.

| Requirement | Current behavior | Evidence | Status | Required fix |
| --- | --- | --- | --- | --- |
| Ashby exact posting | Exact ID/jobUrl + explicit isListed | exact provider contracts | Pass | None |
| Greenhouse exact posting | Exact public ID endpoint only | exact provider contracts incl board-shaped/unproven response | Pass | None |
| Lever exact posting | Public v0 global/EU, exact ID | exact provider contracts | Pass | None |
| Unsupported ATS | Workday/SmartRecruiters/Recruitee UNSUPPORTED | verifyPostingAts and fixture | Pass | No scraper |
| Generic page | 200 UNKNOWN; unchanged exact closure NOT_LISTED | genericPageResult fixtures | Pass | No generic active inference |
| Canonical JD | Provider descriptions, lists/additional; source endpoint retained | provider contracts and builder | Pass | Phase 4 parsing deferred |
| Search provenance | SDK grounding chunks/query strings, aliases retained | actual discovery executor fixture | Pass | None |
| Verification error | UNKNOWN, false listing, no fabricated default | network/exception fixtures | Pass | None |
| UNLISTED | Ashby explicit false; content retained, not closed | exact provider contracts | Pass | None |
| Removed | Published feed exact absence or exact 404 | provider fixtures | Pass | No closure reason invented |
| Publication | Only provider last-published/first-published/creation | provider/date fixtures | Pass | Lever optional field caveat labeled |
| First seen | Local discovery; unchanged on history match | history fixture | Pass | None |
| Updated | Greenhouse update remains updatedAt | provider/date fixture | Pass | None |
| Freshness | Publication only; missing/invalid/future UNKNOWN | date/builder fixtures | Pass | None |
| Batch dedupe | Shared seen set/merge, aliases/sources preserved | identity and canonical-alias fixtures | Pass | None |
| Workspace dedupe | ATS ID then URL then conservative known-location fallback | shared identity fixtures | Pass | None |
| History dedupe | Every application status considered, metadata-only refresh | all 12 statuses; notes/resume/answers/history | Pass | Preserve history |
| Missing canonical URL | No example URL; URL-less leads discarded; unknown canonical empty | builder + jobSchema fixture | Pass | None |
| Query budget | Actual Gemini-request count; explicit discovery_requests unit | executor validates budget and counts calls | Pass | Google internal count unknowable |
| Search profile | Allowlisted configured constraints, custom query suggestions | executor excludes identity/contact + validation | Pass | No hardcoded assumptions |
| Fetch boundary | DNS screened/pinned, redirects/deadline/body/type bounded | blocked destinations, redirected DNS, size/type/deadline/lookup fixtures | Pass | Deployed egress smoke pending |
| Unassessed | No scores/default family; runtime schema requires explicit state | builder/jobSchema/executor | Pass | Phase 4 deferred |

## Specialist findings

Docs-researcher (Luna Medium, read-only) confirmed public provider contracts,
Ashby unlisted semantics/compensation summaries, Greenhouse first_published vs
updated_at, and Lever optional public createdAt schema caveat. Security-reviewer
(Sol High, read-only) found a demonstrated Node lookup callback defect: Node's
all=true request requires an address array. Fixed with both callback shapes tested.
No additional demonstrated SSRF bypass in the scoped review. Independent reviewer
recheck could not run due specialist usage availability; parent fixture recheck
passes both array/scalar pinned callback forms. No redundant mapper/triager spawned.

## Live gates and limitations

Gemini smoke Unverified: GEMINI_API_KEY absent; only .env.example exists.
Runtime provider smoke Unverified: official documentation/demo response reviewed,
but application adapter live smoke not run. Optional bounded manual procedure in
TESTING.md. This does not block deterministic code completion.

Generic aliases without a supported canonical link/redirect or stable identity
remain unknown/separate; no fuzzy alias invention. Dedupe uses the complete loaded
client workspace; deleted jobs/history outside that collection cannot be matched.
Existing assessments are retained, not certified or recomputed. Canonical metadata
refresh does not implement Phase 4 assessment invalidation/re-ranking. The generic
closure heuristic is limited to explicit job-specific wording on the exact unchanged
page, not a claim of general page-state extraction. IPv6 fetch policy is conservative.
Private workspace revision/owner/history invariants and Phase 1/2 fixtures unchanged.

## Completion gate

Focused suite, complete npm test (40/40), typecheck, build, harness, privacy scan
(zero findings) and git diff --check passed. Existing client chunk warning remains
(536.18 kB). Final release composition passes all 40 tests/typecheck/build/harness
and strict required-build privacy scan (zero findings); startup smoke passes 1/1.
Checkpoint publication uses normal dev fast-forward; actual refs/clean state are
verified at handoff. No main, PR, Studio, production deployment or Phase 4 actions.
