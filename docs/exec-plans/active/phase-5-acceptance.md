# Phase 5 acceptance matrix

Baseline: clean dev, fetched origin/dev = 8882f7207060ec5182ede4e424963c8102863c94.
Scope: resume provenance, tailoring, manual validation; no Phase 6.

| Area | Before edits | Required acceptance |
| --- | --- | --- |
| Eligibility | Client canTailor; stale-only client guard | Current Phase 4 fingerprint; SKIP excluded, stretch allowed |
| Plan inputs / selection | Browser matches/session prose; model IDs unchecked | Owner records and matched eligible IDs, explicit actions |
| Master source | Browser master treated as truth | Persisted presentation; eligible evidence establishes claims |
| Identity | Browser contacts; model project dates/names | Persisted deterministic contacts/employers/titles/dates/education |
| Experience | Array index zero only | All persisted experiences selectable without mixing scopes |
| Projects | Hardcoded preferences/model metadata | Persisted IDs and distinct project evidence scope |
| Summary | Free generation, no provenance | Exact-text ledger and evidence validation |
| Skills | Free JD backfill | Each technical label has eligible support |
| Bullets / evidence IDs | Optional single ID/free underlyingEvidence | Stable claims, multiple normalized IDs, unknown/ineligible IDs rejected |
| Metrics | Prompt-only restriction | Preserve metric meaning; no count-to-percentage/outcome changes |
| Technologies | Prompt-only restriction | Supported within relevant scope |
| Ownership / leadership | Warning on first verb only | No stronger scope without evidence |
| Dates / titles / employers | First employment preserved; model project dates | Deterministic full relationship checks |
| Manual edits | Direct replacement retains state | Changed exact text invalidates validation |
| Revalidation | Absent | Explicit actual-text support validation |
| Regeneration | Browser free-text proof | Resolve persisted claim/evidence, failure preserves prior content |
| Restore | Copies master text without checking | Requires current support validation |
| History | Optional snapshots | Deliberate checkpoints for generated/edit/validated versions |
| Evaluation | summaryPass/skillsPass true defaults | Derived enabled-claim, identity, basis checks |
| Export | Every format emits arbitrary text | Shared readiness fence across print/text/Markdown/LaTeX |
| Page fit | Character heuristic claims ~1 page; model isOnePage true | Explicit estimate/unknown, no verified one-page guarantee |
| Stale assessment | Old resume silently remains usable | Artifact basis records JD/evidence/profile/algorithm fingerprints |
| Model failure | Loose JSON parsing | Strict structured schema, bounded request, no fabricated fallback |

## Results
Deterministic Phase 5 provenance contract verified: focused 11 grouped tests and
full 63/63 tests. Strict schemas, owner-only routes, all source experiences, complete
approved statement support, metrics/technology/scope rejection, manual invalidation,
actual-text revalidation, stale basis, immutable certified history and server final
export checks have fixture/repository coverage. App source shares one readiness
fence for print/text/Markdown/LaTeX/JSON; native print is explicitly draft.

Conservative certification accepts complete rawEvidence statements and explicit
technology labels. Whitespace/terminal punctuation rewrites can revalidate;
arbitrary semantic paraphrases need separately reviewed concise evidence. Sentence,
abbreviation and newline extraction are prohibited because they may detach denials.
Master is presentation and deterministic identity, never claim evidence authority.

Reviewer reproductions: detached denied ownership, all-work-disabled/unsupported
skill client export, and import overwrite of certified history. All fixed with
regressions; existing certified snapshots bypass import normalization/upsert.
Typecheck/build/harness/release/privacy initially pass (zero privacy findings).
Final release composition, standalone evidence validator, startup smoke 1/1 and
diff check pass; reviewer confirms all three original reproductions resolved.

Live Gemini resume-generation acceptance: pending external configuration.
No process GEMINI_API_KEY; only .env.example. No private career records transmitted.
Authenticated browser, rendered PDF pagination and deployed acceptance remain live
gates. Page fit remains explicitly estimated/unknown, never a one-page guarantee.
No Phase 6 work performed.
