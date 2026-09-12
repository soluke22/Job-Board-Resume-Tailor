# Job search pipeline

## Current State — Phase 3
Search discovery -> source provenance -> provider detection -> exact posting
verification -> canonical JD -> status/dates/freshness -> history-safe dedupe ->
unassessed record. Qualification, evidence retrieval and ranking are Phase 4.

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
assessments/history are preserved, not re-ranked. Existing manually invoked analysis
remains inherited and is not certified as evidence-grounded Phase 4.
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

## Target State — later phases
After discovery acceptance: deterministic supported blockers -> qualification ->
approved owner evidence retrieval -> evidence coverage -> application priority ->
screened tailoring. Inherited blocker heuristics/cache remain in searchEngine.ts
but are no longer called by discovery; Phase 4 must audit them against evidence
and configured constraints rather than preserve candidate-specific assumptions.

## Validation
Synthetic contracts and manual smoke instructions: [TESTING.md](TESTING.md).
Acceptance and limitations: [Phase 3 matrix](exec-plans/active/phase-3-acceptance.md).
