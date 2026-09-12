# Job search pipeline

## Current State — Phase 4
Search discovery -> source provenance -> provider detection -> exact posting
verification -> canonical JD -> status/dates/freshness -> history-safe dedupe ->
unassessed record -> source-backed requirements -> approved owner evidence retrieval
-> validated semantic matching -> deterministic qualification/coverage/priority.

### Discovery source is not canonical source
server/discovery.ts builds the prompt from allowlisted configured SearchProfile
preferences. No candidate identity/contact/evidence is sent by discovery. Optional
customQueries are passed as search-query suggestions; provider execution cannot
be guaranteed. Grounding web source URLs and actual SDK webSearchQueries are
retained. Missing grounding metadata is not fabricated. Discovery company/title
labels remain in discoveryCompany/discoveryTitle; a provider title replaces the
display title when available. No company identity is invented from a board slug.

discoveryUrl, discoveryAliases, discoverySourceUrls and discoverySummary retain
untrusted discovery data. canonicalUrl/applyUrl come from supported provider
responses, not generated URLs. URL-less leads are discarded. Empty canonical
URLs are allowed for inconclusive leads; discoveryUrl remains available.

description/rawDescription contain canonical provider content only for discovery
records. canonicalContentStatus is AVAILABLE, UNAVAILABLE or UNSUPPORTED;
canonicalContentSource and canonicalMetadata preserve source and provider data.
Ashby uses descriptionPlain/descriptionHtml, Greenhouse content, Lever
description plus lists and additional content. Provider HTML is retained as text
data, not rendered/executed as HTML. Requirements, responsibilities, technologies,
hiring signals and seniority are not generated from snippets. Phase 4 will parse
the canonical JD. User-pasted descriptions remain user input, not verified ATS facts.

### Exact ATS semantics
LISTED requires exact positive public-post evidence. UNLISTED is an Ashby posting
published for direct links with isListed false, not closed. NOT_LISTED is exact
absence from a successful authoritative published-postings feed, an exact public
endpoint 404, or an explicit job-specific closure notice on the same generic URL.
No particular closure/archive reason is inferred. UNKNOWN includes errors,
unexpected data, missing IDs, board-only URLs and ambiguous generic responses.
UNSUPPORTED covers recognized Workday, SmartRecruiters and Recruitee without
trustworthy adapters; no brittle scraper was added.

Ashby: published postings feed, exact ID/jobUrl match and explicit isListed.
Greenhouse: exact public job-post ID endpoint only; no board-success fallback.
Lever: public v0 posting endpoint, including EU, never authenticated v1.
[Official provider contract review](exec-plans/active/phase-3-provider-contracts.md)
records API/content/date/compensation details and public schema limitations.

HTTP 200 is not LISTED. Generic pages remain UNKNOWN unless the exact unchanged
page explicitly reports closure. Redirects or canonical links to supported ATS
URLs locate an alias; the exact provider endpoint must still verify it. Arbitrary
custom aliases with no authoritative identity relationship are not guessed.

### Dates and freshness
publishedAt comes only from Ashby publishedAt (last publication), Greenhouse
first_published, or numeric Lever createdAt when actually supplied (creation,
optional public v0 field). publicationDateSource labels those semantics.
updatedAt is Greenhouse updated_at, never substituted for publication.
firstSeenAt is local observation and survives rediscovery.
lastVerifiedAt is the local verification attempt, including inconclusive attempts.

Freshness uses publication only: NEW 0-7 days, RECENT 8-21, ESTABLISHED 22-45,
OLD over 45. Missing, invalid or future publication yields UNKNOWN.
UI separately labels publication uncertainty and first seen; first seen is not posted.

### Dedupe and history
src/utils/jobIdentity.ts is shared server/client logic. Order: supported ATS
provider + board/site + stable posting ID; normalized canonical URL; conservative
known company/title/location fallback only without conflicting stronger identity.
Different requisitions never title-merge. URL normalization removes fragments,
known tracking parameters and trailing slashes, sorts meaningful query parameters,
and maps boards.greenhouse.io to job-boards.greenhouse.io. IDs remain case-sensitive.

Within-batch and existing workspace matches merge discovery aliases/sources.
All application statuses are considered, including applied/rejected/withdrawn/
archived. Matched jobs return refreshedJobs rather than discoveredJobs. Only
verified canonical metadata refreshes; IDs, firstSeenAt, application stage/history,
notes, assessments, resumes and attachments survive. UNKNOWN may update the last
attempt/status without deleting previously retrieved content. Client uses the same
merge and ordinary revisioned workspace save; no direct discovery DB write or stale
revision auto-merge was added. ExistingJobs is the client's complete loaded workspace,
and the client merges replies against its latest cache after awaiting discovery,
preserving edits made in flight and ignoring refreshes for meanwhile-deleted IDs;
not an independent historical-provider database; deleted jobs cannot be matched.

### Unassessed is not fit
New discovery and pasted records explicitly use assessmentStatus UNASSESSED and
applicationPriority UNASSESSED, with no numeric fit/coverage or family default.
Runtime persistence rejects scores attached to UNASSESSED records. Existing
assessments/history are preserved. Legacy private assessments are marked STALE,
not certified until reassessed through the Phase 4 contract.
Classification is not fit. Removed discoveries are not returned as new active leads;
unlisted/unknown/unsupported records retain visible uncertainty, not active claims.

### Request budget
One Gemini grounding request runs per successful invocation. queryBudget (1-10)
is an upper bound on discovery requests, not a requested number of Google queries.
discoveryRequestsUsed counts the actual request invocation; legacy queryBudgetUsed
is an alias with queryBudgetUnit discovery_requests. Internal Google query counts
cannot be measured reliably; returned grounding query strings are provenance only.
Invalid budgets/custom query shapes reject before any discovery request.

### Fetch boundary
server/safeFetch.ts serves generic verification and /api/fetch-job-url retrieval.
Only HTTP(S), no credentials/nonstandard ports; reject local/internal names and
loopback/private/link-local/metadata/reserved destinations. DNS answers are checked
and pinned to the socket; redirects are checked again (at most four). Single total
8-second deadline covers DNS/redirects/body. Only text/html or text/plain is accepted,
with streamed 1 MiB limit. IPv6 policy is conservatively global-unicast only;
mapped IPv4 is blocked. Fixed provider APIs reject redirects, use an 8-second
signal and streamed 4 MiB JSON cap. An unavailable/bounded fetch does not fabricate
content or status. Fetch-job-url page text explicitly remains UNKNOWN.

## Phase 4 assessment protocol
/api/analyze-job and compatibility /api/match-evidence accept only a persisted
jobId. The authenticated owner repository supplies JD, enabled verified evidence
and SearchProfile. Caller profile/evidence/project/skill fields are rejected.
AVAILABLE canonical description is preferred. Explicit jdSource user-provided is
allowed and labeled honestly; discovery snippets and generic URL fetches alone
return INSUFFICIENT_JD. A user editing/pasting description explicitly supplies it.

Shared strict Zod contracts live in src/types/assessment.ts. Gemini 3.8 Flash
extracts exact short excerpts for job facts and hard/preferred/responsibility
requirements. Exact substring checks reject invented excerpts. Stable IDs hash
kind and excerpt; source start/end offsets are retained. The model classifies
the canonical five families/modifiers but never supplies final scores.
Every extracted requirement must be matched exactly once. Unknown, duplicate or
omitted requirement coverage fails; unknown/ineligible evidence IDs fail; support
IDs deduplicate. Non-Missing needs supplied support; Missing has none. Strong
requires direct substantial support; Moderate meaningful partial/adjacent support;
Weak limited indirect support; Missing no approved support. Semantic correctness
and completeness of JD extraction still need live/manual acceptance: exact spans
prove source presence, not perfect interpretation or complete extraction.

Retrieval tokenizes requirement/evidence language, technologies, responsibilities
and supported verbs. Exact overlap contributes 3, a small documented adjacency
dictionary contributes 1. Positive relevance only; per-requirement relevance ranks
and round-robin selection bound the bank to 32, stable ID tie-breaks make bank
order irrelevant. Domain language is available in evidence prose. No project/skill
free text becomes independent support. This lightweight dictionary is deliberately
limited and may miss synonyms; no vector database or first-N selection is used.

### Deterministic algorithm phase4-v1
For each present requirement group, average match coefficients. Weights are hard
0.80, preferred 0.15, responsibilities 0.05, renormalized over present groups.
qualificationFit = round(10 * weighted average, 1 decimal), with Strong 1,
Moderate 0.70, Weak 0.25, Missing 0. Evidence coverage uses Strong 1, Moderate
0.50, Weak 0.10, Missing 0 and the same groups. If the respective hard-group
average is below 0.50, cap that score at 5.9. Seniority/years/domain influence
qualification through actual extracted requirements and demonstrated support,
never invented candidate years or title-to-years mappings. No family coefficient.

Constraint fit stays categorical, separate from qualification. Persisted policy
can block explicit excluded/unsupported employment types, mandatory relocation,
required clearance, remote-only conflicts, explicit required onsite location
outside configured hybrid locations, interpretable days-per-week maximum,
annual USD authoritative maximum below minimum salary, explicit company or
literal configured title exclusions. Negated/optional onsite and negated clearance
are handled conservatively. Ambiguous frequency/location remains unknown.
Known AI/algorithm/multiple-takehome preferences, absence of preferred takehome
when explicitly stated, below-target salary, role-family/modifier/seniority
preferences affect strategy only. Unknown process/salary does not fabricate a
mismatch. Salary comparisons require comparable annual USD facts; no currency
conversion or hourly extrapolation. Constraint language parsing is bounded and
conservative, not a universal policy reasoner.

SKIP when a real constraint blocker exists, exact posting NOT_LISTED, or
qualificationFit < 5. APPLY FIRST when fit >= 8.5, coverage >= 7.5 and no
preference/status/freshness concerns. Otherwise STRONG WITH GAP for fit >= 7,
CALIBRATED STRETCH for fit >= 5. STRONG WITH GAP replaces legacy STRONG for
new assessments; historical strings remain compatibility types only.
Recommendation SKIP agrees with SKIP; APPLY when fit >= 7 with no concerns;
otherwise SELECTIVE_APPLY. Unknown/unlisted posting or OLD publication adds a
strategic concern, never a qualification penalty. A 7.0 can recommend APPLY,
and 10.0 can SKIP due to personal constraints. Fit explanations derive from
validated matches; gaps/constraint/preferences derive the negative explanation.

### Freshness, persistence and legacy compatibility
Persisted metadata includes source, JD SHA-256, sorted eligible semantic-evidence
fingerprint, SearchProfile plus posting-status/publication/effective-freshness/
compensation fingerprint, algorithm version and timestamp. Repository reads mark
changed/legacy results STALE; history is retained. Canonical refresh invalidates
immediately; client evidence/profile edits conservatively mark scores stale.
Current triage hides stale scores, without deleting history. Unchanged certified
metadata reuses persisted assessment and invokes no Gemini; process-local cache
and candidate title heuristics were removed. Ordinary saves cannot certify changed
assessment or derived display fields; only the assessment service does so under
the original workspace revision. In-flight conflicts return 409; client never
overwrites local edits with an assessment reload and requires explicit reload.

Deprecated initialFitScore/tailoredFitScore both derive from qualificationFit;
they no longer estimate improvement from tailoring. UI shows qualification and
coverage. Legacy verdict/canTailor derive from recommendation without an 8.0
gate. Automatic gap-interview generation was removed from assessment; existing
interview/provenance behavior is deferred to Phase 5 and is not certified here.

### Model boundary and live status
Two bounded semantic requests maximum: extraction, then matching when relevant
eligible evidence exists. Strict structured JSON schema, separate systemInstruction,
MEDIUM thinking and 30-second SDK request timeout; no fake fallback or retry.
Scores/priorities are absent from model schemas, so injected output fields fail.
Candidate contact/identity metadata is excluded, free-text evidence is redacted
against the persisted profile, and evidence IDs remain unchanged.
No GEMINI_API_KEY configured during acceptance: deterministic/mocked contracts
verified, live semantic acceptance pending external configuration.
SDK syntax reviewed against [official SDK config](https://googleapis.github.io/js-genai/release_docs/interfaces/types.GenerateContentConfig.html),
[structured outputs](https://ai.google.dev/gemini-api/docs/structured-output),
[model](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash) and
[Zod JSON Schema](https://zod.dev/json-schema). Zod dialect metadata is removed;
actual schema/service acceptance still needs the bounded synthetic live smoke.

JD != evidence; classification != fit; fit != application priority;
preference != blocker; adjacency != direct experience;
model semantic judgment != final arithmetic.

## Resume tailoring — Phase 5
Tailoring requires current persisted Phase 4 assessment fingerprints and matched
eligible owner evidence. SKIP/hard blockers are excluded; calibrated stretches
remain eligible without an 8.0 score gate. Deterministic plans use requirement and
evidence IDs for keep/omit decisions, project selection and supported skill labels.
Master content supplies presentation/identity, never independent truth. Structured
Gemini output may select/reorder complete approved evidence statements, with scope,
IDs and exact text validated server-side before readiness. No free JD skill backfill.

Manual edits invalidate exact-text approval; explicit checkpoints/revalidation and
persisted-envelope regeneration preserve history. Artifact readiness and shared
final export respond to changed JD/evidence/profile/master basis. Print page fit is
an estimate requiring browser preview. See [EVIDENCE_MODEL.md](EVIDENCE_MODEL.md)
for the conservative complete-statement validation contract and live limitations.
Phase 6 proof packs/outreach/application answers are not certified by this phase.

## Validation
Synthetic contracts and manual smoke instructions: [TESTING.md](TESTING.md).
Acceptance and limitations: [Phase 3 matrix](exec-plans/active/phase-3-acceptance.md).
