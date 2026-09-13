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

### Deterministic algorithm phase4.1-v2
Phase 4.1 calibration hardening preserves Phase 4 provenance and Phase 5 gates.
Qualification coefficients: Strong direct 1; Moderate direct .80, adjacent .55;
Weak direct .30, adjacent .15; Missing 0. Strong adjacent is rejected.
Coverage: Strong direct 1; Moderate direct .65, adjacent .35; Weak direct .15,
adjacent .05; Missing 0. Relationships affect both scores.

Server group weights: hard/minimum .60, core scope .30, other standard
responsibilities .05, preferred .05. Average within each present group,
renormalize absent groups, multiply by ten and round to one decimal.
Core responsibilities represent material delivery/ownership from JD prose,
never inferred from title. Centrality is categorical, with exact contiguous
centralityExcerpt containing the requirement excerpt; no model numerical weights.
Critical classifications require hard requirements and explicit minimum context.
Explicit hard years/senior ownership depth is critical regardless of model
classification. Professional/production domain criticality uses source-backed
classification; a production keyword alone does not make a minor requirement
critical. Legacy shapes remain readable: hard defaults
standard and responsibilities default core. Requirement IDs remain kind/excerpt
hashes; classifications do not change source identity.

Caps apply to both scores: any critical partial support (<1) caps at 8.4;
any critical Weak/Missing (qualification value <=.30)
caps at 7.4; at least half of core scope adjacent/Weak/Missing (<=.55) caps at
7.2; at least half of core scope Weak/Missing (<=.30) caps at 6.4. Respective
hard-group average below .50 retains the 5.9 cap. Lowest applicable cap wins.
One minor standard hard gap has no individual cap. Caps are explained in whyNot.

Professional depth requires eligible employment-scoped evidence (Full-time,
Contract or Internship, employer/role/period/sourceLocation, no project/hackathon
source). Project or unknown-scope support is at most Moderate adjacent. Duration
requires explicit approved evidence years meeting the stated minimum in the same
source sentence as the requirement domain terms, using the lower bound of ranges,
with negative/qualified statements
withheld conservatively; unknown or
short duration is at most Weak adjacent. Calendar periods are retained for scope,
not summed into invented tenure. The semantic matcher must establish that duration
and ownership refer to the required domain. Exact source/context checks cannot
independently certify semantic support; live/manual extraction/matching remains
an external gate. No candidate, title, role-family or outcome coefficients.

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
qualificationFit < 5. APPLY FIRST requires fit >= 8.8, coverage >= 8.5, no
preference/status/freshness concerns or critical/core cap, all central requirements
direct with at least Moderate support and at least 80% Strong. If no central
requirements exist, hard requirements form that profile. Otherwise STRONG WITH GAP for fit >= 7,
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
changed/legacy results STALE; history is retained. Phase 4.1 includes evidence context/employer/role/period/source scope
in the fingerprint. phase4-v1 assessments become STALE; linked Phase 5 resumes
lose READY/final export through existing basis validation without regeneration.
The UI displays a ten-point score and priority; no separate five-point fit exists.
Canonical refresh invalidates
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

## Phase 6 downstream writing
Current owner job/JD + current Phase 4.1 assessment + eligible persisted evidence
(+ current READY Phase 5 resume for proof packs) -> strict artifact-specific model
selection -> deterministic support/length validation -> revisioned persisted draft.
No external sending/submission occurs. Proofs retain every enabled claim's exact
Phase 5 envelope and become stale when that resume changes. Recruiter/referral fit
reflects calibrated priority, never a generic frontend assumption or direct-fit
promise for a stretch. Company enthusiasm and relationship history are not invented.

Application questions route before model use; factual questions retrieve bounded
relevant evidence per question. Profile fields assemble deterministically; subjective
motivation, preferences/compensation, sensitive identification/health and legal
attestations remain review/manual. Server owns state and source fingerprints; local
source edits immediately fence copying, and repository reads recheck freshness.
Changed artifact content cannot inherit validation through saves/imports.
[Phase 6 acceptance](exec-plans/active/phase-6-acceptance.md) records conservative
whole-statement/partial STAR limits and external Gemini/browser gates.
Proof explanation is not new evidence, outreach confidence is not qualification,
model-written motivation is not user motivation, relationship labels do not establish
history, and an application answer is not an unsupported personal attestation.
READY does not send or submit content.

## Phase 7 application history and observed outcomes

Private lifecycle requests accept jobId, targetStatus, requestId and optional event
facts, never replacement history. The server locks the owner workspace row, loads
the persisted job, validates and commits status, event, audit and revision together.
Forward stages may skip intermediate interviews. Backward changes and terminal
reopening require an explicit correction. OFFER is observed, not accepted.
ARCHIVED is organization state, not rejection; prior outcomes remain in history.

Shared runtime/TypeScript events use from, to, timestamp, optional note, stable id,
recordedAt, kind and requestId. Repeating current status is a no-op unless adding a
note/reason observation. Retries of a persisted request do not append events/audits;
reuse for different facts is rejected. At 5000 events new writes fail before commit.
Corrections append supersedesEventId + correctionReason. The original stays stored;
superseded destinations are excluded from analytics. Corrections can be corrected. Legacy current state with no established transition
history can be explicitly corrected/confirmed with a reason; this records the old
state in from but never backfills a historical fit snapshot.
Current state is the latest effective timestamp (append order breaks ties), so an
older correction cannot silently reopen a later rejection. Backdated normal events
before existing progression are rejected; explicit corrections support dated fixes.
Dates may be supplied; absent dates use server now. Future timestamps are rejected.

First effective APPLIED supplies appliedDate. A trustworthy legacy submission date
is preserved through postapplication progression/correction and archiving; an
explicit correction to preapplication state may clear it. Its server-captured immutable snapshot
retains assessed algorithm/fit/coverage/priority/recommendation/family/modifiers and
fingerprint only when the persisted assessment is current. Unassessed/stale fit is
UNKNOWN, never promoted. Publication freshness is measured at the supplied applied
instant; unknown publication stays UNKNOWN. Discovery source, ATS provider,
verification and selected application channel stay separate. Referral drafts never
establish a referral. Current reassessment never overwrites the snapshot. If a
correction changes the effective application instant, a mismatching original
snapshot remains audit history but is excluded from segmentation; no score backfill.
Legacy applications never receive application-time scores from current assessments.

Rejection reasonText is optional; reasonSource is employer-provided,
recruiter-provided, user-observed, user-inferred or unknown. A rejection without a
reason remains unknown. Outcome source is manual/email/recruiter/portal/other/unknown,
entered manually; this phase introduces no connector or email ingestion.

One shared server-safe engine computes owner history analytics for API, storage,
AnalyticsView and Dashboard. An explicit effective APPLIED destination (or valid
legacy appliedDate for submission only) establishes an application. Each job counts
once per explicitly recorded screen, hiring manager, technical, final, offer,
rejection or withdrawal. Any interview is one of the four interview destinations;
offer alone does not fabricate an interview. Each conversion numerator counts
applications that reached that event, denominator is all recorded applications,
including rejection/withdrawal/archive. Zero denominator returns zero. No stage
hierarchy manufactures absent events. Weekly [start,end) event activity is supported
by the pure engine; window mode withholds conversion rates because event activity
is not a submission-cohort denominator. No weekly-report product is added.

Cohorts use matching application-time snapshots: family, modifiers (once per unique
tag), qualification bands (<7, 7–<8.8, 8.8–10) plus priority and algorithm, selected
application channel, publication freshness, ATS and discovery source. Missing
historical assessment is UNKNOWN / LEGACY; legacy explicit application-channel
observations remain usable. Each cohort returns n, interview/technical/offer/rejection/
withdrawal counts, rates and sampleState. n<5 INSUFFICIENT_SAMPLE, 5–14 EARLY_SIGNAL,
>=15 OBSERVED; no statistical significance is claimed. UI withholds percentages for
tiny segments. Time-to-event medians require at least five valid nonnegative pairs;
unknown timestamps never create durations. These are observations, not strategy
recommendations or scoring labels. No Gemini or automatic Phase 4.1 tuning.

Legacy status/notes destination events normalize to from:null/to/note with their
actual valid timestamp. Canonical events retain their shape. Malformed events are
retained in private historyQuarantine, excluded from analytics; overflow tails stay
in a quarantine envelope. No unknown predecessor/stage/date is invented. This is
JSON contract normalization; no SQL migration. Reads, saves and imports normalize;
server transitions durably retain quarantine. Ordinary browser writes preserve
stored lifecycle fields; new browser histories require explicit owner import.
Imports of matching job IDs preserve stored history/snapshots; new selected owner
imports retain historical events/snapshots as owner-reported backup data, never as
candidate evidence. Export/import and disk restart have synthetic coverage.

current status ≠ historical funnel; rejection ≠ known reason; outcome ≠ causal
scoring signal; current score ≠ application-time score; ATS provider ≠ application
channel; archived ≠ rejected; small sample ≠ reliable conclusion.
