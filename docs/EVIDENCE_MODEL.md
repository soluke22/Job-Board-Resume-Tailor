# Candidate evidence and resume provenance

## Current contracts
Phase 4 assessments and Phase 5 resumes resolve authenticated-owner persisted
records. Eligible evidence is owned, enabled, verified and has no unresolved
requiresUserReview state. Unknown, disabled, rejected, imported or unreviewed
assertions cannot support final claims. JD requirements establish employer needs,
never candidate facts. Skill confidence and project descriptions are not evidence.

Master resume != evidence authority.
Generated text != verified claim.
Manual edit != still verified.
JD != candidate evidence.
Final export requires current validation.

## Claim ledger
`src/types/provenance.ts` defines a strict reusable ResumeClaim contract:
claimId, artifactId, claimType, scopeId, text, textHash, sourceKind,
supportingEvidenceIds, supportingProjectIds, targetRequirementIds, generationMode,
validationStatus, validatedTextHash, validatedAt, validationAlgorithmVersion, issues.
Summary, experience/project bullets, each technical skill and any project technology
label have claim records. IDs remain stable through editing and regeneration;
versions retain the ledger supporting that exact artifact. Source/master wording is
preserved separately for restoration. Free underlyingEvidence prose is not proof.

States: verified, requires-review, manual-edit-unvalidated, unsupported, rejected.
A model cannot output certification fields. Only server validation links a SHA-256
of actual text to eligible records. Browser edits immediately clear validation and
mark their hash pending server recomputation. Ordinary saves cannot promote claims,
replace the saved assessment basis, or rewrite certified history. Imports preserve
existing certified versions and downgrade new assertions; JD requirement records
retain their strict source shape without acquiring candidate-review flags.

## Conservative support validation
`server/resumeProvenance.ts` certifies complete approved rawEvidence statements,
allowing whitespace and terminal sentence punctuation normalization. It never
splits sentences, abbreviations or paragraphs: extraction can detach a denial or
qualification from its context. Shorter wording needs its own reviewed evidence
record. Arbitrary paraphrases are withheld as unsupported, even when plausible.
This deterministic contract proves faithful reuse of approved statements, not
independent semantic truth of the owner's evidence. No model validator can approve
unsupported additions by retaining IDs.

Technology labels require explicit eligible evidence technologies. Employment
claims require matching persisted employer, actual title and period; personal
project/hackathon evidence cannot migrate into employment. Project evidence must
identify the persisted project by ID or exact name in sourceLocation. Unknown scope
fails closed. Metrics retain their referents because the whole supported statement
must match: Jira ticket counts cannot become bugs, percentages or revenue outcomes.
Leadership/ownership/outcomes cannot be strengthened or migrated between roles.
Target requirement IDs must exist and have a Phase 4 match to supporting evidence.
Duplicate supporting IDs normalize; unknown/ineligible IDs reject.

## Assessment and artifact basis
Phase 4.1 uses context, employer, role, period and source location/type for
professional-depth safeguards and assessment fingerprints. Personal/project
support cannot equal professional production support. Duration requires an explicit
approved statement meeting the minimum; periods are not summed into tenure.
Semantic domain/seniority support remains subject to source-grounded matching.
The phase4.1-v2 bump invalidates phase4-v1 assessments and linked READY resumes;
historical text/claim ledger remains intact and migration does not regenerate.

A new resume requires current ASSESSED Phase 4 JD/evidence/SearchProfile/algorithm
fingerprints; UNASSESSED, STALE, failed and legacy assessments cannot certify it.
SKIP/hard-blocked roles are excluded, while calibrated stretches remain eligible.
Resume basis retains assessment fingerprint, JD hash, complete eligible-evidence
fingerprint, profile fingerprint, master/profile fingerprint and tailoring version.
Repository reads recheck basis and support. Changes make the historical artifact
STALE rather than silently current. Identity/contact/education and each employment
or project name/title/period are assembled from persisted master data. Gemini sees
only narrowed requirements, IDs, supported source claims and redacted evidence.

## Editing, readiness, history and export
Manual summary/bullet edits are allowed and invalidate exact-text certification.
Inclusion alone retains support, but at least one enabled work claim is required.
Explicit checkpoint/revalidation compares current text to owner evidence. Restoring
master/previous text awaits the same current support check; past approval is never
automatically sufficient. Failed regeneration leaves the prior artifact intact.

DRAFT means uncertified/legacy presentation; NEEDS_VALIDATION means unresolved
current claims or deterministic identity checks; READY requires every enabled
factual claim validated; STALE means assessment/evidence/master basis changed.
Generated, regenerated, edited-before-validation, revalidated and final-export
checkpoints retain complete immutable certified snapshots and evidence IDs.
No per-keystroke history is created. Editor history exposes snapshot claim text,
validation state and evidence references. Deleted jobs still remove their history.

Plaintext, Markdown, LaTeX, JSON and app Print/PDF share the same fence. Final
export rechecks the persisted artifact server-side under the workspace revision,
records the version selected for export, and compares it with visible content.
Export checkpoint records selection, not proof the OS print/download completed.
Native browser printing is labeled draft unless the app just confirmed final print.
Cover letters remain separately labeled uncertified drafts and are not certified
by resume approval. Phase 6 consumes this contract through separate downstream validation.

## Validation and limits
See [TESTING.md](TESTING.md), [Phase 5 acceptance](exec-plans/active/phase-5-acceptance.md)
and [execution plan](exec-plans/active/productionization.md).
The standalone evidence validator checks ID/eligibility/ownership integrity only,
not semantic support. Live Gemini and authenticated/deployed browser/print acceptance
remain external configuration gates. Page fit is an estimate, never a page-count
or ATS guarantee.

## Phase 6 downstream artifact contract
Proof packs, recruiter outreach, referral requests and application answers resolve
the authenticated owner's current persisted job, assessment and eligible evidence.
Browser evidence/profile/score/readiness/resume assertions are rejected. The existing
Phase 4 eligibility primitive is shared; there is no separate approval rule.

`src/types/artifacts.ts` and `server/artifactProvenance.ts` retain artifact ID/type,
job ID, assessment/evidence/JD/profile fingerprints, optional exact resume hash,
generation time/algorithm, supporting evidence/requirement IDs, actual text hash,
validated hash, state and issues. Repository reads compare current basis; changed
JD, evidence, assessment or relevant profile makes artifacts STALE. Proofs also
require the exact current READY Phase 5 resume and enabled claim ledger. Stable
batches cover every enabled factual claim, including summary and skills.

The model selects supported statements/IDs through strict schemas. Factual prose
reuses complete approved evidence statements; new technical context, scope changes,
metrics, ownership and unsupported STAR outcomes fail. STAR situation/task/result
are withheld as not documented because current records lack reviewed atomic STAR
component contracts. This conservatism must not be replaced by forced story completion.

Recruiter/referral introductions use persisted role/company and calibrated Phase
4.1 fit. APPLY FIRST allows close alignment, STRONG WITH GAP names gaps, CALIBRATED
STRETCH uses transferable overlap. SKIP/blockers require an explicit override reason
and remain NEEDS_REVIEW. Outreach needs no resume. Contact names/relationship labels
stay server-side; no relationship history is invented or contact details sent.

Questions route to EVIDENCE_BACKED, DETERMINISTIC_PROFILE, ROLE_MOTIVATION,
PREFERENCE, SENSITIVE_MANUAL or UNKNOWN_MANUAL before generation. Per-question Phase
4 relevance retrieval bounds model evidence to eight records. Profile location,
work authorization and stored master education assemble without Gemini; missing or
unreviewed data needs input. Salary, preferences, legal attestations, unknowns and
sensitive self-identification/medical/mental-health/pregnancy/age questions stay
manual with empty responses. Sensitive selected statements/technology labels are
withheld, and unrelated evidence metadata is not sent. Lexical classification is
conservative and not exhaustive semantic understanding.

Motivation uses neutral role alignment or separately identified verbatim user input,
and always remains NEEDS_REVIEW. No admiration, emotions or interest history are
inferred. Actual word/character constraints are measured; stricter declared/source
limits win and overlong text fails, preserving the prior artifact.

READY means factually grounded and current. DRAFT is uncertified/legacy/import text;
NEEDS_REVIEW includes manual edits, subjective input and overrides; STALE has changed
sources. Ordinary saves cannot forge approval, IDs or a new basis. Changed actual
content clears validated hashes; fresh generation validates it again. No artifact
text editor or semantic edit-certifier is introduced. Non-ready app copy controls
are blocked; content stays visible for review. Cover letters remain uncertified.

proof explanation ≠ new evidence
outreach confidence ≠ qualification
model-written motivation ≠ user motivation
relationship label ≠ invented relationship history
application answer ≠ factual attestation without support
READY ≠ automatically sent/submitted
