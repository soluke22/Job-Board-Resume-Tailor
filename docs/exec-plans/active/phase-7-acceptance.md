# Phase 7 acceptance matrix

Baseline: clean dev == freshly fetched origin/dev == e751f05e230239cd772b74372702493a770dac8f.
Scope: durable owner application events, application-time assessment, deterministic
observational analytics and truthful pipeline UI. No Phase 8 or scoring changes.

## Before-edit inspection

| Area | Existing behavior / mismatch | Required acceptance |
| --- | --- | --- |
| Current application state | Browser logOutcome replaces state through workspace save | Server transition loads owner job and commits atomically |
| Transition history / schema | Client writes status/notes; validator expects from/to/note | One shared runtime/TS event, recoverable legacy normalization |
| Applied timestamp | Repeated APPLIED overwrites date | First effective application event retained |
| Stage timestamps | Client timestamps, invalid history cannot persist | Durable validated timestamps for every event |
| Repeated updates | Duplicate same-status events and browser audit | No-op same stage; explicit note and retry key supported |
| Terminal / withdrawal | Withdrawal absent in analytics/UI | Separate rejection, withdrawal and offer observations |
| Archive semantics | Rejected labeled Archived / Rejected | Archive preserves prior hiring history |
| Rejection reason provenance | Free text called Learning Engine; no source | Optional text and explicit source, unknown valid |
| Application channel | Analytics uses discovery sourceChannel | Actual selected application channel; unknown preserved |
| Assessment at application | No snapshot | Server first-application snapshot; stale/unassessed unknown |
| Funnel / screens / technical / finals / offers / rejections / withdrawn | Current-status hierarchy; rejection erases interviews, withdrawal/archive omitted | Explicit effective events; once per job per stage, no invented skipped stages |
| Fit-band conversion | Current priority/score | Application snapshot score, priority and version |
| Role-family conversion | Current classification | Snapshot family or UNKNOWN / LEGACY |
| Modifier conversion | Always empty | Snapshot modifiers, each job once per modifier |
| Source/channel conversion | Discovery and application conflated | Separate snapshot discovery and application channel |
| Freshness conversion | Always empty | Application-time publication freshness; unknown date stays unknown |
| ATS-provider conversion | View expects byAts, engine provides no ATS | Snapshot descriptive ATS cohort |
| Small samples | Global n<15 only, bars have artificial minimum | Every cohort count/rate/sample state; zero safe |
| Learned insights | Hardcoded +28%, 100%, 3x, zero conversion and strategy | Remove; observed counts only, no causal learning |
| Historical / legacy applications | Arbitrary replacement history; no snapshots | Normalize recoverable events, quarantine malformed; no current-score backfill |
| Corrections | No safe correction operation | Append correction referring to mistaken event; effective analytics exclude corrected event |
| Dashboard | Independent current-state outcome counts | Shared analytics output |
| Artifact readiness | Object existence means Ready | Actual Phase 5/6 readiness states |
| Persistence / import / restart | JSON child rows persist but replacement history trusted | Protect server lifecycle; export/import preserves history/snapshot, owner isolation |

## Acceptance and formulas

Applications require an explicit effective APPLIED destination (legacy appliedDate
may establish only submission, never missing interview stages). Each job counts at
most once per explicit destination. Any interview is recruiter screen, hiring
manager, technical or final; offer alone does not manufacture an interview.
Rates use applications as denominator. Segments use first-application snapshots;
missing snapshots remain UNKNOWN / LEGACY. n<5 INSUFFICIENT_SAMPLE, 5..14
EARLY_SIGNAL, >=15 OBSERVED; these labels do not claim statistical significance.
Corrections append an audit event with supersedesEventId and reason; superseded
events remain stored but are excluded from effective stage counts. Normal forward
progression may skip stages; backward/terminal reopening requires correction.

## Results

Shared event contract, atomic owner transition/audit/revision, protected stored
lifecycle, first-application snapshots, explicit reason/channel/source, deterministic
funnel/all seven cohort dimensions, conservative samples/medians and truthful UI
implemented. Focused 12/12 pass. Corrections retain original events and can be
corrected; current state reconciles by effective timestamp with append-order ties.
Legacy current state with no established events has explicit reasoned correction/
confirmation without score backfill. Legacy submission dates survive later stages.
Matching imports retain original lifecycle; new selected backup imports and disk
restart preserve exact events/snapshots. Malformed data stays quarantined; 5000-event
write limit rejects atomically, oversized legacy tails are retained in quarantine.

Reviewer demonstrated old corrections reopening later rejection, irrevocable
corrections, history overflow truncation and legacy appliedDate loss. Each has a
regression and directly verified fix; no remaining demonstrated bounded defect.
Public synthetic browser verified stage vocabulary, readiness/form layout and
APPLIED → recruiter screen → rejection preserving 1 application/1 screen/1 interview/
1 rejection with n=1 insufficient labels. No fabricated learned claims remain.
Final release results/publication are recorded below after completion.

Live authenticated browser, Neon concurrent
transport and earlier provider/model gates remain external; fixtures are synthetic.

## Local completion gates
Focused Phase 7 12/12; full npm test 95/95. Phase 4/4.1/5/6 regressions pass
within full suite (prior expanded focused run 69/69). release:check passes
TypeScript/build/harness/full tests/strict required-build privacy, zero findings.
Standalone privacy zero; both synthetic evidence validators pass; built startup
smoke 1/1; db:generate no schema drift; migration upgrade tests and diff check pass.
Final last-source release validation passes 95/95 and all composed gates.
Publication is recorded in the active plan.
Build client chunk 639.41 kB, existing >500 kB warning retained (shared runtime
validation increases size). Public synthetic AX/form/reload checks pass; no claim
of full authenticated browser or live Neon multi-connection acceptance.
