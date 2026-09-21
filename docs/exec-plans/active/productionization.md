# Productionization execution plan

## Preview QA workflow remediation (2026-09-21)

Scope: remediate only the three browser-demonstrated defects from the SHA-bound
`08926658` dev-preview QA: distinguish local Search Preferences validation from
durable-save failure, retain the Add Job modal through saved-job analysis failure
with stable-ID retry semantics, and prevent unassessed or stale Job views from
rendering assessment-derived conclusions. Preserve the existing revisioned
persistence queue, owner-only fail-closed behavior, evidence trust/review model,
assessment/artifact invalidation, and Quick Grab fences. The QA documentation
commit immediately below this work is not a product baseline change.

Acceptance: focused behavioral tests prove validation, creation/retry/navigation,
and assessment display contracts; Node 24 release checks and whitespace checks
pass; protected storage/API/server/evidence-review contracts are unchanged. A new
SHA-bound browser preview retest remains required before the original QA FAIL may
be reconsidered. No remote, deployment, or live-resource action is in scope.

Builder result: PASS after one consolidated correction cycle. Sol accepted the
actual diff with no remaining blocker/high defect in the three scoped workflows.
Independent Node 24.19.0 clean install, focused UX suites (25/25), full and
release suites (140/140), typecheck, build, harness, privacy, runtime, and
whitespace checks pass. The remediation preserves the original preview QA FAIL;
next exact step is independent diff review, then separate publication and new
SHA-bound browser acceptance only when authorized.

## Daily-workflow UX correctness scope (2026-09-20)

Authorized baseline: clean `dev` and `origin/dev` at `41a3e96`; `origin/main`
remains `befa128`. Scope is the final bounded client workflow correction for Add
Job + Analyze, Quick Grab readiness/enabled-content/clipboard truthfulness, durable
Search Preferences and Master Resume saves, acknowledged-mutation supersession,
and basic modal/async correctness in files already touched. One builder owns
in-scope discovery, implementation, deterministic tests, debugging and synthetic
local UX smoke. Sol owns architecture, protected-boundary decisions, final diff
review, integration gates and the single local checkpoint commit.

Acceptance: reuse only the existing `storageService` snapshot and revisioned
`persistCurrent` queue; use existing `canExportFinal` and existing invalidation/
provenance contracts; creation must durably acknowledge one stable job before
analysis and preserve that same job for partial-success retry; explicit saves must
publish only acknowledged, nonsuperseded state; Quick Grab must fence non-ready
tailored content and exclude every disabled bullet; clipboard success must follow
the fulfilled API promise. Protected storage/API/evidence-review/server files and
`tests/evidence-review.test.ts` stay unchanged unless Sol first approves a
demonstrated necessity. Required Node 24 install, focused behavioral tests, full
release gates, diff review and supported synthetic smoke must pass. No main, push,
PR, deployment, dependency upgrade or live-resource action.

Result: PASS. The builder completed one consolidated correction cycle and Sol
accepted the final actual diff with no remaining blocker/high correctness defect.
Node 24.19.0 clean-install validation passed: focused workspace/job/Quick Grab/
evidence suites 22/22, full and release suites 137/137, typecheck, build, harness,
privacy, runtime and whitespace checks. Protected security-baseline files remain
unchanged. No browser surface was available, so interactive synthetic smoke remains
explicitly unavailable; deterministic workflow tests cover the supported local
substitute. Next exact step: independent diff review, then Vercel dev-preview
acceptance only after the local checkpoint is intentionally published to `dev`.

## Workspace persistence UX checkpoint (2026-09-20)

Result: PASS. From the preserved builder-harness baseline `00616df`, one bounded
builder implemented explicit durable-save UX for Candidate Setup and Evidence
Bank. Candidate profile drafts now follow adopted data only while clean and show
truthful clean/dirty/saving/failure states. Manual evidence and approval use
synchronous duplicate-submit guards, retain dialogs through acknowledgement, and
publish only adopted durable results. Manual evidence remains review-required;
approval retains the existing persisted ID/revision/SHA-256 server protocol. Main
workspace and Quick Data Grab remount keys are distinctly namespaced.

Changed implementation scope is limited to `src/App.tsx`,
`src/components/CandidateSetupView.tsx`,
`src/components/EvidenceBankView.tsx`, `src/context/AppContext.tsx`, and the new
`tests/workspace-ux.test.ts`. The protected storage/API/evidence-review/server
baseline and `tests/evidence-review.test.ts` are byte-identical to `00616df`.
No second queue, endpoint, component fetch, client-created Verified state,
automatic ambiguous-failure recovery or auth/private-readiness weakening was
introduced.

Node 24.19.0 validation: focused workspace UX 3/3; complete suite 123/123 with
zero failures or skips; typecheck, build, harness, privacy scan, runtime check,
release:check and diff checks pass; strict privacy reports zero findings. Synthetic
local Evidence Bank smoke saved one manual record, increased the count exactly
once, rendered Needs review and closed only after acknowledgement. No duplicate-key
console capture was available in the smoke environment; the distinct key contract
is covered by focused source validation. Existing Rollup annotation and >500 kB
bundle warnings remain non-blocking. No live resources, deployment or remote branch
were touched. Next exact step: independent review, then publish the local dev
checkpoint to a dev preview when separately authorized; do not modify main.

Independent review correction: PASS. The explicit private profile action now stages
the current storage-backed profile and exactly invalidated jobs, acknowledges that
complete snapshot through the existing queue, then publishes React state. Manual
evidence follows the same pattern for current storage-backed evidence plus assessed-
job/artifact invalidation. Unsuperseded failures restore staged storage without
publishing phantom state; durable failure remains reload-required. Candidate submit
uses a synchronous guard. Behavioral tests cover acknowledgement ordering, failure,
supersession, current-storage evidence, dependent assessment/artifact staleness,
clean/dirty draft adoption and same-frame submission. Protected security files and
the evidence-review suite remain unchanged. Node 24.19.0 focused tests pass 12/12
(workspace UX 7/7, evidence review 5/5); full and release suites pass 127/127 with
zero failures/skips; typecheck, build, harness, normal/strict privacy zero, runtime
and diff checks pass. Correction commit is local only; no deployment or live-resource
action. Next exact step: independent review of the correction commit before any
separately authorized push or preview publication.

## Bounded implementation builder harness (2026-09-20)

Scope: reconcile the unpushed AI Studio documentation checkpoint onto canonical
`origin/main`, add one bounded write-capable builder role, document Sol/builder
ownership, and create the workspace-persistence UX worker contract. No UX
implementation, production source, remote branch, deployment or live-resource
change is authorized. Acceptance: supported custom-agent TOML and harness checks,
existing specialist/domain-skill preservation, no production-source diff, one
local checkpoint commit, and an explicit current-host discovery/restart result.

Result: PASS. Reconciled `dev` at `f443681` with `origin/main` as ancestor and
preserved the original `f18085c` tip at `backup/pre-builder-f18085c`. Builder
TOML parsing, harness integrity and diff checks pass; existing domain skills and
read-only specialist TOMLs are unchanged; no production source changed. The
current host's already-loaded role registry does not expose `builder`; fully
restart/reopen Codex before using it. Next exact step: after restart, delegate the
workspace persistence UX brief to one builder; Sol reviews the actual diff and
runs acceptance before integration.

## AI Studio canonical-main import acceptance (2026-09-15)

Owner completed GitHub connection. AI Studio's import dialog explicitly states
imports do not stay synced. Selected the listed soluke22/Job-Board-Resume-Tailor
main entry; AI Studio reported Successfully imported 156 files from GitHub and
created app d1ba3882-10e2-4b0d-a4af-f89540b1ce32. Existing stale shared app was
not modified or deleted. EXISTING_APP_NOT_SYNCABLE / replacement required.

Exact Git SHA is not exposed. SOURCE_EQUIVALENCE_VERIFIED against canonical main
befa1282232e0fca880d78485c58ce34d2ff1308 by source markers: Add Evidence,
Needs review, Review &amp; approve and Verified; approveEvidenceItem;
evidenceReviewContent/evidenceReviewHash/contentHash; private approval API;
persisted-ID/revision validation; owner-scoped server repository approval;
preserveEvidenceReview/unreviewedEvidence and review-required imports. ATS source
has Ashby/Greenhouse/Lever supported adapters and slice(0,3) verification scope.
Assessment phase4.1-v3 present. AI Studio converted package-manager host state
(package-lock omitted and bun.lock shown); no application source rewrite requested
or accepted and no push control used.

Public demo PASS in embedded and direct preview: synthetic Jordan Taylor fixture,
current Add Evidence and Verified render. Added one explicitly synthetic public
preview-only record to exercise new state; Needs review rendered. Review & approve
source/control is present and correctly private-owner-gated, so it is not exposed
in public demo. Private mode PASS fail-closed: Workspace Security & Access retained
Public Demo Mode Active, no private data, and requires verified owner Google login.
No provider credentials/secrets entered. App build successful. Host debug reports
HMR websocket disconnects and a nonfatal duplicate React key warning
(PUBLIC_DEMO0); the app remains rendered and this key comes from unchanged App.tsx,
not PR3. No PR3 runtime failure demonstrated.

AI Studio verification PASS WITH HOST LIMITATION: exact SHA unavailable, import is
a non-syncing replacement, AI Studio substitutes package-manager host state, and
private approval UI cannot be exercised without production owner auth. Production
settings weakened NO. No GitHub/Vercel/Neon mutation, AI source generation, real
career data or Gemini invocation. Remaining blocker NONE. Ready production Gemini
acceptance YES; Gemini calls remain0. Replacement URL:
https://aistudio.google.com/apps/d1ba3882-10e2-4b0d-a4af-f89540b1ce32


## AI Studio canonical-main update attempt (2026-09-15)

Scope: prefer in-place update of saved app 6e455b3c-588b-4598-a6d9-9d02b1ac8869;
otherwise preserve it and freshly import soluke22/Job-Board-Resume-Tailor main at
befa1282232e0fca880d78485c58ce34d2ff1308. No manual file copying, AI rewrite,
GitHub/Vercel/Neon mutation or Gemini invocation.

Finding: EXISTING_APP_NOT_SYNCABLE. The shared saved app is read-only, says Remix
to make this app your own, and exposes only ZIP download under source export. It
has no GitHub refresh/sync/re-import or replace-source control. Old app untouched.
New app workflow exposes Import from GitHub and requires Sign in to GitHub. The
button was invoked through accessibility and semantic controls, both hidden and
visible, but no OAuth window/tab opened and the import dialog remained unchanged.
Fresh import cannot continue until the owner completes the GitHub connection in
the visible browser. Connection text warns the resulting editor can also push to
the selected repository; no authorization or repository selection has occurred.
No replacement app exists yet. Gemini calls remain0. Next exact step: owner clicks
Sign in to GitHub and completes the required GitHub authorization, then import only
canonical main and verify PR3 source/render contracts.


## Saved AI Studio access retry (2026-09-15)

Retry scope: open shared app 6e455b3c-588b-4598-a6d9-9d02b1ac8869 after
owner access change; inspect source/render against canonical main
befa1282232e0fca880d78485c58ce34d2ff1308. No replacement/remix, GitHub,
production, provider, configuration or real-data mutations. No Gemini calls.

Result: ACCESSIBLE through the shared-app warning. AI Studio labels it as an app
from another developer and permits read-only source/preview inspection. Exact Git
SHA is not exposed. Source is stale and not equivalent to canonical main: rendered
Evidence Bank says Add Verified Evidence and has no Needs review, Review & approve
or distinct review-status UI. Source search has no /api/workspace/evidence-approval,
evidenceReviewContent or evidenceReviewHash, and the visible EvidenceBankView uses
only add/toggle/delete actions. PR3 evidence-review checkpoint therefore fails.

Public synthetic demo PASS: Jordan Taylor fixture loads without provider access or
startup failure; no real/private career data observed. Private boundary PASS: mode
switch opens Workspace Security & Access, retains Public Demo Mode Active and
requires the owner's verified Google account; no private workspace is exposed.
Embedded preview works, so no iframe host limitation applies. ATS provider scope
PASS: imported adapter contract/search confirms supported Ashby, Greenhouse and
Lever adapters (other detected ATS labels remain unsupported/fail-closed per the
canonical contract). Assessment algorithm PASS: phase4.1-v3 is present in imported
server/tests source. Production settings weakened: NO.

AI Studio verification FAIL due to stale saved-app source, not external access and
not a production defect. Remaining blocker: update the existing saved app from
canonical GitHub main without changing GitHub/production, then repeat source/UI
render checks. Ready to resume production Gemini acceptance: NO. Gemini calls0.


## Saved AI Studio verification attempt (2026-09-14)

Scope: inspect saved app 6e455b3c-588b-4598-a6d9-9d02b1ac8869 against canonical
main befa1282232e0fca880d78485c58ce34d2ff1308; refresh only through normal
GitHub import/update if stale. Acceptance requires source equivalence, PR3 review
UI, public synthetic demo, fail-closed private boundary, ATS scope and algorithm.
No different app unless irrecoverably broken; no Gemini calls or production edits.

Result: supplied https://ai.studio/apps/6e455b3c-588b-4598-a6d9-9d02b1ac8869
redirects to aistudio.google.com with the same app ID and displays Page not found.
Go to Build works. Signed-in My apps shows No apps yet and Allow Drive access.
The actual Allow Drive access button was clicked; no authorization dialog, new tab
or app appeared. No permission grant was completed. This does not establish that
the saved app is irrecoverably broken, so no replacement app was created.

AI Studio source freshness/render/demo/private boundary remain UNVERIFIED;
verification FAIL (access blocker), not a demonstrated CareerOS defect or iframe
HOST_LIMITATION. Production evidence-review remains PASS from prior acceptance.
No production security setting weakened; no source/configuration/database edits,
no real data created and no Gemini invocation. Next exact step: recover access to
this saved app (working accessible app link or owner-resolved AI Studio Drive
access), then inspect source and run Phase11 host regression. Ready Gemini: NO.


## PR3 merge and production review acceptance (2026-09-14)

PR3 final audit PASS: open main<-dev, one expected commit, exact head
0796b34cfb06440bee5492b6c87786ed98cf5df3, base6da65a3f78f798aece45994b4420625dfb0c0bf9,
MERGEABLE/CLEAN, Vercel preview success, no review requests or unresolved threads.
Complete diff A-L reviewed: eligibility unchanged, ordinary saves cannot promote
trust, persisted owner ID/revision/content hash approval, transactional audit,
material-edit demotion, toggles preserve review, imports require approval and
canonical invalidation remains fail closed. No demonstrated source defect.
Fresh Node24.21.0 release:check PASS: typecheck/build/harness, 120/120 tests, zero
skipped, strict privacy scan zero findings, runtime/client credential markers.
Source/lock contracts and working/PR diff whitespace checks pass.

Before merge, tracked worktree clean; pending acceptance notes/ignore change
preserved in a named stash. Ignored .env.local and .vercel state relocated to a
private temporary backup without reading contents. No such state remained in
repo at merge. No additional source changes or validator weakening.
Merged with exact-head guard at2026-09-14T20:38:47Z; dev retained.
Main befa1282232e0fca880d78485c58ce34d2ff1308 has parents
6da65a3f78f798aece45994b4420625dfb0c0bf9 and0796b34cfb06440bee5492b6c87786ed98cf5df3.
Tree b8843195130a5c2d8ddea47b3f353d7791f0eed4 exactly equals audited head tree.
Origin/local main verified; no unexpected post-merge commit. Stayed on dev.

Automatic Vercel production dpl_79Ag6bvJ8qu2KMo1nw44VecA8t7s READY, Git SHA
befa1282232e0fca880d78485c58ce34d2ff1308, Node24.x, canonical alias
https://job-board-resume-tailor.vercel.app. No duplicate/manual deployment.
Vercel connector scope denied metadata; authorized existing CLI/API read fallback
verified it. Health200, owner auth/session200 and workspace/data200; session active.

Normal production UI PASS: Add Evidence -> synthetic Review Co./Frontend Engineer
statement -> Needs review; DB confirms session-unreviewed/requiresUserReview=true,
eligible0. Review dialog exposes complete claim metadata; explicit approval200.
DB verified=true, requiresUserReview=false, lastVerifiedAt present, approval audit1.
Verified card rendered before and after reload. No material edit UI; live edit
demotion NOT_APPLICABLE, covered by server tests. UI deleted test record; DB
evidence0/jobs0, revision6, verified owner1/Google account1/unexpired session1,
approval audit1 retained by design. AI reservations0; Gemini never invoked.
Bounded20m/100-row deployment log scan returned13 rows: no5xx, invocation failures
or scanned credential/raw-provider-payload markers. Observability remains bounded.

Production evidence-review acceptance PASS. AI Studio checkpoint UNVERIFIED /
AI_STUDIO_APP_ACCESS_REQUIRED: signed-in My apps asks Allow Drive access, no app
available. No access granted or auth weakened. Existing Drive metadata searches
did not identify CareerOS app; no unrelated file contents read. Asked for direct
existing app URL. Cannot classify in-host source/render verification as passed.
Next exact step: open the established AI Studio app against NEW canonical main,
verify Evidence Bank/manual review/status/public demo and host auth limitations.
Ready to resume Gemini acceptance: NO until this checkpoint is completed.
Owner tab retained; stop before Gemini. These are post-merge local audit notes.

## Evidence review usability fix scope (2026-09-14)

Predecessor/canonical main: 6da65a3f78f798aece45994b4420625dfb0c0bf9.
Dev fast-forwarded from a clean tree after stashing acceptance notes and the
unrelated .gitignore change. Live Gemini acceptance is paused; no provider calls,
production configuration, remote database mutations or deployment in this fix.

PRODUCT_DEFECT / EVIDENCE_REVIEW_WORKFLOW_MISSING: manual creation says verified
but saves session-unreviewed; imports require review; no approval UI/function/route.
Ordinary saves also need to fence request-supplied trust. Implement a narrow
owner-scoped persisted-record approval action, exact inspected-content/revision
checks, accurate card states and a review dialog. Material claim-field edits
demote approval; enabled alone preserves it. Reuse canonical invalidation.
Acceptance: focused eligibility/import/edit/approval/persistence/denial/conflict/
invalidation tests, full Node24 lint/tests/build/privacy/harness/release audit;
scoped dev commit and dev-to-main PR for review, without merge or deployment.

Implemented: accurate Add Evidence wording, Needs review/Verified/Disabled text,
inspectable complete claim metadata and explicit approval dialog; owner-only
persisted ID/revision/content-hash route and atomic approval/audit. Ordinary saves
cannot create/promote trusted evidence or keep trust after claim edits. Imports
remain review-required. No edit UI existed; AppContext edit mutations and server
saves now demote material edits. Enabled alone preserves approval. Canonical
fingerprints/snapshot inspection and existing client readiness helpers fence stale
assessment/resume/Phase 6 outputs. Eligibility predicate remains unchanged.

Validation: five grouped new review tests and existing Phase 4/5/6 suites pass;
full npm test 120/120, zero skipped. Initial full run had a native ESM child
timeout; isolated smoke and complete rerun passed unchanged (no validator relaxed).
Node24.21.0 lint/typecheck, build, harness, strict privacy/public build scan and
runtime/client/secret markers pass. Source-vs-lock dependencies/engines match.
Read-only security specialist found no demonstrated defects. React review checked
state, approval error handling, disabled actions and import-safe rendering.
Final composed npm run release:check passed: 120/120 tests, typecheck/build,
harness, strict privacy scan (zero findings) and runtime/client checks.

Next: review dev-to-main PR, merge only after approval, verify canonical main in
AI Studio, then deploy via the established release workflow. Production still has
the old UI until that workflow completes; normal-UI approval/reload and live Gemini
acceptance remain pending. Owner session/configuration/Neon production untouched.

## Phase 12 authorized staging runtime fix
Scope: repair only relative import resolution in the Node-executed Function graph
on dev. Live canonical main 0f0acdd51238cf7e9a692291bb5c2e58e2e0d818 fails with
ERR_UNSUPPORTED_DIR_IMPORT at api/index.ts:1, before Express initialization.
Acceptance: reproduce with unbundled emitted JavaScript and native Node24 (no tsx
loader); resolve the complete reachable runtime graph; public unconfigured health
returns 200 JSON; npm ci/typecheck/tests/build/runtime/release gates pass; scoped
dev checkpoint only. Preserve local .gitignore/.vercel/.env.local linkage; exclude
these and credentials from commit. No main edit, PR, deployment, environment
change, migration or OAuth/Blob/Gemini configuration. Phase11 remains accepted
per owner confirmation. Local fix complete; validated dev checkpoint follows.

### Phase 12 local validation result
Native Node24.21.0 baseline reproduced the live directory-import exception in
unbundled emitted api/index.js. Explicit .js relative specifiers now resolve
through TypeScript to source .ts files and through Node to emitted .js files;
directory type imports explicitly name index.js. Audited runtime graph includes
30 Function-startup source modules plus the local shell. All 23 changed TypeScript
files change only import/export specifiers, including two shared server-consumed
utilities; frontend-only modules untouched. No dependency/configuration changes.
New tests/phase-12-native-esm.test.mjs emits separate modules without rewriting
specifiers or bundling, runs a native child without inherited loaders/private
environment/dotenv files, imports the Function and verifies public health200 JSON.
It runs directly with Node24 --test and in npm test; the prior tsx suite and bundled
local build did not exercise native unbundled module resolution.
Node24 npm ci, typecheck, full115/115 tests, build, runtime:check and release:check
pass; direct native regression1/1 passes. Strict build privacy zero; harness passes.
Client hashes/706087 bytes unchanged. Existing four moderate tooling advisories,
Rollup annotation and >500kB client warnings remain. No Vercel artifact build or
redeployment performed; deterministic emission is the local regression equivalent,
not a live runtime acceptance claim. Final staged privacy/harness/diff checks and
dev-only commit follow. Next exact action: obtain separate PR authorization;
main remains canonical affected SHA; live staging acceptance still blocked until
reviewed merge and separately authorized staging redeploy/health verification.

## Project Goal
Truthful discovery and evidence-grounded career workflows with durable owner-only
private storage and a separate synthetic demo. GitHub is canonical.

## Current Branch
dev; audited candidate 2d73941c126a313f35788b8b64f097ed5c3a3d8a merged into main
through PR #1 using the normal merge commit strategy. Documentation checkpoint
continues through dev; no additional main changes.

## Current Phase / Scope and Acceptance
Phase 10 — complete, PASS. Owner explicitly authorized PR #1 dev -> main merge.
Phase 11 is ready but has not begun.

## Current Status
PR #1: https://github.com/soluke22/Job-Board-Resume-Tailor/pull/1 — MERGED.
Final fetched origin/main: 0f0acdd51238cf7e9a692291bb5c2e58e2e0d818.
Pre-merge fetched main 18bde7f451e4e5f39e303f82a0507a30233cd35e and dev
2d73941c126a313f35788b8b64f097ed5c3a3d8a matched the authorized tips;
GitHub base main/head dev, CLEAN/MERGEABLE, clean local candidate with no later
commits or unexpected file changes. Main-side 0 / dev-side 27 commits.
Merge parents are exactly those two tips; audited dev is an ancestor of merged
main, merged tree equals candidate, and only the merge commit exists outside
those parents' histories. PR reports MERGED; dev retained at audited tip before
this documentation-only checkpoint. No squash/rebase/force-push/tag/deletion.
Phase 10 deterministic release validation remains the accepted 114/114 and
clean-source reproduction recorded in the Phase 10 acceptance matrix.
Deferred Vercel, Google OAuth live browser, Neon, Private Blob and Gemini gates
remain PENDING_EXTERNAL_CONFIG. No Studio, deployment or remote migration run.
Next exact step: **Phase 11 — Google AI Studio merged-main compatibility verification.**
Historical entries below retain their original checkpoint context.

## Historical Phase 8 accepted/deferred status

**PARTIAL — code/runtime contract accepted locally; external Vercel/provider acceptance deferred until a Vercel project and isolated staging resources exist.**
Deterministic/local Vercel-compatible contract: verified by the prior accepted gates.
Actual generated Vercel build/Function output, routing/path preservation, deployed
SPA/deep links and largest-response provider acceptance: pending external project setup.
Google OAuth: pending stable staging configuration. Neon: pending non-production
resource configuration. Private Blob: pending non-production Vercel configuration.
Gemini: pending key/configuration. See the [deferred-gate matrix](phase-8-acceptance.md).
No .vercel/project.json exists; CLI probing was incomplete at the prior usage cutoff.
These are deferred external configuration, not a demonstrated architecture defect.
No live success claimed; no code changes or new platform probing in this deferral.
Node 24.19.0 certification; Node 24.x deployment pin; npm/package-lock only; obsolete
Bun lock removed and recoverable from Git. Explicit npm ci/build/output settings.
SPA fallback excludes bare/nested API and assets; adapter forwards supplied path and
method unchanged. Finish/close/error/abort/290s deadline clean listeners/settle once;
DB close is bounded at 5s and closed boundaries cannot reopen. Concurrent synthetic
owners/data/errors/artifacts and request DB isolation pass, as do stream errors and
disconnect cleanup. Raw Better Auth library provider logging disabled after test
output exposed synthetic DB error objects; generic application failures retained.
Installed Blob 2.8.0 implicit OIDC+store resolution/precedence/static local fallback
passes synthetic SDK tests; no credential options/refresh snapshot are introduced.
Static canonical auth and exact Origin stay intact; ordinary preview is public demo,
private stable staging requires separate origin/Google callback/DB/store/secrets.
Function/Neon region pair, remote migrations, private preview isolation and live
cookies/OAuth/Neon/Blob/Gemini remain external configuration gates. Runbook/environment
matrix and scoped runtime build scanner are documented. Six moderate npm install
advisories and existing 639.41 kB client chunk warning are recorded, not silently fixed.
Final tests: focused 10/10, full 105/105; release composition passes typecheck/build/
harness/full tests/strict required-build privacy zero findings. Final synthetic env
sentinel build/runtime client scan passes (3 files/706107 bytes). Migration drift,
both evidence validators, built startup smoke and diff check pass. Publication
recorded in the checkpoint below; plan encoding normalized from four legacy dash bytes.

## Next Exact Step
**Phase 11 — Google AI Studio merged-main compatibility verification.**
Not begun in this turn. Deferred external gates remain unchanged.

## Historical Phase 7 Branch
dev; Phase 7 began clean at freshly fetched dev == origin/dev ==
e751f05e230239cd772b74372702493a770dac8f (published Phase 6).
User authorizes coherent Phase 7 commits and normal fast-forward origin/dev push.
No main, PR, Studio, deployment, external messages/submission or Phase 8.

## Historical Phase 7 Scope and Acceptance
Phase 7 — Application tracking + outcome analytics, deterministic contracts complete.
Acceptance: [Phase 7 matrix](phase-7-acceptance.md). Parent owns writes: shared
runtime/TS lifecycle history, atomic owner transitions/audit, immutable application
snapshot, legacy normalization/quarantine, correction/idempotence, deterministic
observed funnel/cohorts and truthful UI. Phase 4.1 scoring stays unchanged.
Phase 4.1 [calibration](phase-4-1-calibration.md), Phase 5/6 acceptance remain intact.

## Historical Phase 7 Published Status
Phase 7 deterministic contracts complete and published at 46f5fa2. Focused 12/12; full npm test
95/95 and release:check (typecheck/build/harness/strict build privacy) pass.
Standalone privacy zero findings, both synthetic evidence validators, built startup
smoke 1/1, db:generate no drift and git diff --check pass. Final source check after
last reason-source normalization passes all release gates. Reviewer directly
verified all four demonstrated correction/overflow/legacy-date defects resolved;
no remaining demonstrated defect in the bounded review. Public synthetic browser
verified stages, form controls, insufficient-data labels and screen history retained
after rejection/reload. Authenticated/deployed browser and Neon multi-connection
behavior remain external gates. Client chunk is 639.41 kB (existing >500 kB warning;
shared runtime history validation increases size). Implementation published normally; freshly fetched clean dev == origin/dev at
46f5fa2d5c2f18d0f92229682136005fa40fbc56. This documentation checkpoint records
publication; its own publication is verified in the final task report.
No Phase 8 implementation or scoring changes.

Previous Phase 4.1/5 publication evidence (historical):

Phase 4.1 calibration hardening complete locally. Focused Phase 4/4.1/5 29/29,
full suite 69/69, final release composition, startup smoke 1/1, standalone evidence
validator, privacy triage (zero findings) and git diff --check pass. Reviewer
directly rechecked both demonstrated calibration defects and confirmed resolved.
Calibration checkpoint ac28e4f published by normal fast-forward to origin/dev;
fresh fetch verified clean dev == origin/dev after publication. This documentation
checkpoint records completion; verify clean/equal fetched refs after its publication.
Algorithm phase 4.1-v2; old assessments/artifacts become stale via existing basis.

Phase 5 conservative deterministic contract complete and published. Focused 11/11 and full
63/63 tests pass; initial release composition passes typecheck/build/harness/tests
and strict required-build privacy scan, zero findings. Final validation complete; implementation c00c5e2 published to origin/dev by normal
fast-forward. This documentation checkpoint records completion; verify clean/equal
fetched refs after publication. Phase 5 deterministic contract passes; live gates
remain pending. Live Gemini acceptance pending external configuration; no key exists
in process and only .env.example is present. No private records sent to a live model.
This is complete-statement certification; general semantic paraphrases require
reviewed atomic evidence before certification. Authenticated/deployed browser and
actual print pagination remain live gates, not fabricated success.

## Architecture Decisions
Phase 8: Node 24.x/npm; Vite static client plus one api/index.ts Node Function;
300s platform budget, 290s response deadline and 5s bounded DB cleanup. Request-local
Neon WebSocket Pool/Drizzle keeps interactive transactions; auth keyed to request DB.
Provider-managed implicit OIDC Blob preferred deployed; isolated static local token
retained. No globally trusted proxy/Host or wildcard preview auth. Exact origin and
environment/resource isolation stay fail-closed. Actual rewrite contract unverified.

React/Vite + Express/Gemini, Better Auth owner sessions, Neon/Drizzle revisioned
owner workspace, private Blob/recovery intents and isolated synthetic demo retained.
Phase 5 adds strict reusable claim/basis types and a server provenance service.
No database migration: JSON-backed owner resume/version records retain the ledger.
Phase 6 adds strict reusable artifact provenance and server services/routes to existing
JSON-backed proof/outreach/contact/application records. Private generation reads the
owner snapshot and persists under its revision; browser adoption preserves in-flight
edits and session boundaries. Model selection cannot invent new candidate prose.

## Completed Work
Phase 1 b8c9999: auth/session/origin/browser-memory contracts; live OAuth pending.
Phase 2 936a869/3154e0d: durable storage/private file/recovery/runtime contracts.
Phase 3 89b3596: canonical ATS/status/date/dedupe and unassessed discovery.
Phase 4 published at 8882f72: persisted-owner strict requirement/evidence matching,
deterministic qualification/coverage/strategy and current versioned assessment.
See earlier phase acceptance matrices for details and external limitations.

Phase 5: plan/generate/evaluate/validate/regenerate/export accept persisted jobId
and optional claimId only; browser facts and underlyingEvidence are rejected.
Current ASSESSED Phase 4 basis required for new certification; SKIP/hard blockers
excluded without an 8.0 threshold. Matched eligible IDs narrow model context.
Plans retain keep/omit requirement decisions, verified skills and project selection.
Gemini may select/reorder complete evidence statements and supported skill labels;
strict structured schemas prohibit identity, dates, invented IDs and certification.
MEDIUM thinking, 30-second request timeout, one request, no JSON extraction fallback.
Master supplies deterministic header/education and employment/project identity;
all source experiences are selectable with original employer/title/period links.
Master presentation is never evidence authority. Original bullet text is retained
when linked master material exists, without inheriting certification.

Claim ledger covers summary, experience/project bullets, skills and project tech.
Stable claim/artifact IDs, exact text and SHA-256 hash, source/generation mode,
multiple normalized evidence IDs, target requirement IDs, scope, validation hash,
time, algorithm and issues. States: verified/requires-review/manual-edit-unvalidated/
unsupported/rejected. Server checks eligible IDs, full statement support, explicit
technology labels and exact employment/project scope. Requirement targets need a
Phase 4 match to supporting evidence. No metric/verb/ownership inflation.

Browser manual edits clear approval immediately; server saves recompute actual hash.
Explicit checkpoint-and-validate compares actual text to current evidence. Restore
awaits validation; toggling inclusion preserves support but empty work is non-ready.
Regeneration uses only persisted claim/evidence envelope, validates before saving;
model failure preserves the previous version. Revision conflicts return 409 and
local in-flight edits are never overwritten by response adoption.

Readiness: DRAFT, NEEDS_VALIDATION, READY, STALE. Repository reads recheck assessment,
complete eligible-evidence and master/profile basis, identity and every enabled
claim. Legacy artifacts stay historical/stale. Real evaluation derives checks;
no optimistic summary/skills defaults. Edited, generated, regenerated, revalidated
and export-selected snapshots retain full text/ledger. Certified history is
immutable even through imports; ordinary saves cannot forge validation or basis.

Final export is fenced for plaintext/Markdown/LaTeX/JSON/app print/PDF. Server
rechecks persisted READY content, records the selected version and browser compares
it to visible content. Native print carries a draft label without app confirmation.
Cover letters remain visibly uncertified drafts. Page fit is a character-based
estimate, with print preview required; no verified single-page/ATS guarantee.
Print styling preserves identity header and isolates the printable artifact.

## Acceptance Criteria
For every enabled resume claim: exact current text linked to resolvable eligible
owner evidence, support within original scope, current assessment basis and explicit
validated hash. Any unresolved claim, changed identity, empty work or stale basis
blocks final export. Complete local gates pass; live semantic/rendering proofs
remain explicit external gates. Truth precedes relevance/readability/page fit.

## Tests Passed
Phase 8 focused 10/10 on Node 24.19.0; final complete gates recorded in the Phase 8
validation checkpoint below. Initial release suite 102/102 passed before the additional
bounded-close/SDK/auth-logger tests. Runtime build scan passes (3 files/706080 bytes),
db:generate no drift, both evidence validators and built startup smoke 1/1 pass.

Phase 4.1: calibration 5/5, Phase 4 12/12, Phase 5 12/12; complete 69/69.
Final release:check passes typecheck/build/harness/full tests/strict required-build
privacy zero findings. Standalone privacy scan/evidence validator, startup smoke
1/1 and git diff --check pass. Existing 541.45 kB chunk warning remains.
Reviewer directly reran unrelated/negative/range tenure and critical-gap dilution
reproductions: fixed; direct targets retain APPLY FIRST. Live semantic gates unchanged.

Previous Phase 5 checkpoint validation:
Focused Phase 5 11/11; full npm test 63/63. Typecheck/build/harness and initial
release composition pass, strict required-build privacy zero findings.
Final npm run release:check passes typecheck/build/harness, 63/63 tests and strict
required-build privacy scan (zero findings). npm run privacy:scan, standalone
synthetic evidence validator, startup smoke 1/1 and git diff --check pass.
Existing client >500 kB warning remains (541.45 kB).

## Tests Failing / Security Review
Phase 4.1 has no remaining demonstrated defect in this bounded review. Initial
calibration fixture exposed CMS adjacency outscoring senior stretch; core-adjacency
cap now separates them. Reviewer exposed duration-domain/negative/range and
critical-partial dilution; new regressions and fixes verified. See calibration matrix.

No failures in latest focused suite. Full initial suite found protected route count
and legacy artifact metadata expectations; updated assertions retain denied HTTP
coverage and exact legacy text/identity preservation. Reviewer demonstrated negative
context detached by sentence splitting; fixed by complete approved statement reuse.
Reviewer demonstrated all-work-disabled and unsupported-skill client export gap;
fixed with broader invalidation and shared client/server fence regressions.
Reviewer found imports overwriting certified history; existing protected versions
now preserve stored originals through imports without normalization/upsert.
Import round-trip test also found review flags added to strict JD requirement shapes;
source records remain structurally intact while imported assessment stays stale.
All fixes have deterministic regression coverage. Reviewer directly rechecked all
three original reproductions and focused 12/12 suite: resolved; no remaining defect
in this focused boundary review.

## Known Blockers / Remaining Limitations
Live OAuth, Neon multi-connection transport/locking, private Blob CDN/faults and
Vercel/browser/network acceptance remain earlier external gates.
Live Gemini generation/schema/service acceptance awaits server-only configuration.
Exact complete-statement reuse proves preservation of approved evidence; it does
not independently establish truth of owner approval or semantic equivalence of
paraphrases. Longer evidence may need separate reviewed concise statements.
Project evidence requires exact persisted project ID/name sourceLocation;
ambiguous scope is withheld. No automatic years calculation or evidence backfill.
Page-fit heuristic cannot certify actual print/PDF pagination, font/device rendering
or ATS behavior. No document-format ecosystem rewrite. Export snapshot records
selected validated version, not OS/download completion. Native print is draft.
Certified versions persist until explicit job removal; no retention policy redesign.
Legacy gap interviews/cover letters/Phase 6 artifacts remain uncertified.

## External Configuration Needed
Phase 8: explicitly authorized linked nonproduction Vercel project, generated build/
routes/Function size and original path proof; maximum JSON response acceptance;
stable private staging origin/registered Google callback, isolated Neon branch and
PRIVATE Blob OIDC store access; Function/Neon region pair. No production secrets
copied to previews and no remote migrations/deployment performed.

Server-only OWNER_EMAIL, Google ID/secret/callback, BETTER_AUTH_SECRET/URL,
Neon DATABASE_URL/schema, private BLOB_READ_WRITE_TOKEN and GEMINI_API_KEY.
Only synthetic candidate evidence authorized for a live Gemini smoke.
No secrets/private data logged or remote resources created.

## Files / Modules Currently Involved
Phase 8: api/index.ts, server/db/client.ts, server/auth.ts, server.ts runtime errors,
vercel.json, package.json/package-lock, obsolete bun.lock deletion, .env.example,
scripts/runtime-check.mjs, tests/phase-8-runtime.test.ts, deployment/architecture/
testing/router docs, Phase 8 matrix and this plan. Prior business services unchanged.

Phase 4.1: server/assessment.ts, src/types/assessment.ts, focused Phase 4/4.1/5
tests and synthetic evidence fixture; calibration/acceptance/pipeline/evidence/testing
docs and this plan. No Phase 5 generation/readiness implementation changes.

server/resumeProvenance.ts, resumeRoutes.ts, server.ts structured adapter;
workspaceRepository certification/history/import and workspaceValidation;
shared provenance/index types; API/AppContext, editor/evidence/history/export/print
views and CSS; Phase 5 tests, auth/storage expectation updates and domain docs.

## Last Known Good Commit
Phase 8 implementation 743091ea149abe155759d904fa2f861b4d939a20, published by normal
fast-forward; fresh fetch verified clean dev == origin/dev at that checkpoint.
Fresh committed-source archive (no .env, node_modules or untracked files) independently
passed Node 24 npm ci, typecheck, full 105/105 tests, build and runtime client scan.
Phase 8 remains PARTIAL for stated platform gates; docs-only publication checkpoint
follows without embedding its own hash. Earlier Phase 7 publication below is history.

Phase 7 implementation 46f5fa2d5c2f18d0f92229682136005fa40fbc56, published to
origin/dev by normal fast-forward and freshly verified clean/equal refs.
All local completion gates pass; authenticated/deployed/live Neon and earlier
provider/model gates remain external. Phase 6 e751f05 baseline remains intact.
This documentation checkpoint records implementation publication; final report
verifies publication of this checkpoint without embedding its own hash.

## Historical Phase 7 Next Step
Phase 8 — Vercel-compatible architecture completion/live runtime acceptance.
Begin only on a new explicit continuation. This task stops after Phase 7 publication.
Live authenticated/deployed browser and earlier provider/model gates remain external.
Release audit precedes dev/main PR, merged-main Studio verification and final
Vercel production; none is authorized in this task.

## Remaining Phases
1. Authentication code-complete; live Google/browser acceptance pending.
2. Durable database/private files code-complete; live Neon/Blob acceptance pending.
3. Discovery/ATS deterministic contracts complete; live provider/Gemini gates pending.
4. Qualification/ranking deterministic contract complete; live semantics pending.
5. Conservative resume provenance/tailoring/manual validation implemented; live gates pending.
6. Conservative proof/outreach/referral/answer contracts complete; live gates pending.
7. Application tracking + outcome analytics deterministic contracts complete.
8. Vercel-compatible architecture completion/live runtime acceptance.
9. Security/privacy/release audit.
10. dev -> main PR (separate authorization).
11. Google AI Studio verifies merged canonical main.
12. Vercel production after main/Studio verification.

## Phase 6 authorized continuation
Scope and acceptance recorded before code changes in [Phase 6 matrix](phase-6-acceptance.md).
Owner-resolved proof/outreach/referral/answers, strict structured selection and exact
supported statement validation, current assessment/resume basis, manual question
routing, artifact state/staleness and copy fences. Parent owns writes. No Phase 7.
Baseline clean dev == freshly fetched origin/dev at b0be6da57359bb74b8f707302d93816ce41f98fe.
Initial pre-cutoff checkpoint (historical): implementation and validation underway.
Completed validation is recorded in Current Status and Phase 6 completion below.


## Phase 6 recovery implementation checkpoint (2026-09-13, historical)
Recovered existing uncommitted work on dev == origin/dev b0be6da; no Phase 6 commit.
Preserved service/route/type work and repaired misplaced AppContext insertion using
unchanged published definitions. Added UI state/evidence/copy fences, user motivation
and question limits, explicit SKIP reason control, sensitive precedence and model
minimization, strict persisted artifact schemas, synthetic tests. Focused Phase 6
and prior Phase 4/4.1/5 passed 42/42 before final sensitivity regression; typecheck
and build pass. Initial full 81/82 had one legacy DRAFT metadata expectation; exact
content-preservation assertions updated and focused Phase 2/6 now pass. Final
release checks/reviewer recheck pending. GEMINI_API_KEY absent; no live call.
Next exact internal step: final Phase 6 review and all completion gates, then scoped
commit and normal dev publication. Do not begin Phase 7.


## Phase 6 completed contracts and validation
Shared artifact ID/type/job and assessment/evidence/JD/profile/algorithm fingerprints,
optional exact resume hash, generation timestamp, support/requirement IDs and exact
content/validated hashes preserve factual basis. Repository reads return DRAFT for
legacy/imports, NEEDS_REVIEW for manual/subjective/override content, READY for current
validated factual drafts, and STALE when sources change. Local setters/job updates
invalidate immediately, including refreshed ATS/assessment inputs. No external actions.

Proof packs require current READY Phase 5 resume and cover all enabled factual claims
in stable 12-claim batches, including summary/skills. Exact evidence envelope and
full supported statements constrain explanations/context; invented IDs/technology/
metrics/ownership and unsupported STAR results fail. Current evidence lacks reviewed
atomic STAR components: situation/task/result remain explicitly not documented;
action may faithfully reuse the linked claim. Proof explanation is never new evidence.

Recruiter/referral selection uses current matched eligible evidence and requirements.
APPLY FIRST close alignment, STRONG WITH GAP incomplete fit, CALIBRATED STRETCH
transferable overlap. SKIP/hard blockers require an explicit reason and stay review.
No fixed frontend messaging, company enthusiasm or inferred personal interest.
Referral name/relationship label is explicit owner input, no relationship history,
contact details or unrelated metadata sent to Gemini. Outreach needs no resume.

Six question categories: EVIDENCE_BACKED, DETERMINISTIC_PROFILE, ROLE_MOTIVATION,
PREFERENCE, SENSITIVE_MANUAL, UNKNOWN_MANUAL. Factual questions reuse Phase 4 relevance
retrieval (max eight) and validate selected IDs before assembling complete evidence
statements. Profile location/authorization/master education use stored fields with
no model; missing/unreviewed fields need input. Motivation is neutral role alignment
or separately marked verbatim user motivation, always review. Sensitive identity/
medical/mental health/pregnancy/age, legal attestations, preferences and salary stay
empty/manual. No unsupported personal attestation. Real word/character limits are
measured, stricter supplied/source constraint wins; LinkedIn measured <=300 chars.

Ordinary saves/imports cannot forge a basis or approval; changed actual content clears
validated hash, fresh server generation is needed. No artifact text editor/semantic
edit validator added. Views show state/issues/support and block non-ready app copy.
READY is grounded/current for review, never sent or submitted. Cover letters remain
explicitly uncertified legacy drafts. Model prose does not establish motivation.

Gemini uses strict responseJsonSchema + Zod/JSON.parse, MEDIUM, 30-second requests,
no loose JSON fallback, no fabricated fallback and no partial READY save. Only selected
statements/technologies/IDs and relevant requirement/match data reach the model; full
profile/bank/history/contact and sensitive evidence metadata are excluded. Failures
preserve prior content; revision conflicts 409; local edits during requests require
reload and are preserved. Live Gemini pending external configuration, key absent.

Validation: Phase 6 14/14; full npm test 83/83 includes Phase 4/4.1/5 29/29.
Final release:check passes typecheck/build/harness/full tests/strict build privacy
zero findings. Standalone privacy/evidence validator, startup smoke 1/1 and diff
check pass. Existing >500 kB warning remains (546.37 kB). Reviewer original mixed
sensitive questions and metadata reproductions fixed and directly verified. Initial
full 81/82 expectation failure was legacy metadata, not lost content; assertions now
check unchanged legacy content plus uncertified DRAFT without weakening rollback.

Limits: whole-statement support is conservative, not semantic paraphrase certification;
STAR atomic component assignment awaits explicit reviewed evidence contracts; lexical
classification/retrieval is not exhaustive; motivation/override/manual drafts have no
attestation promotion; authenticated/deployed browser/live provider/model gates remain.
Phase 7 — Application tracking + outcome analytics is next, not begun.


## Phase 6 publication checkpoint (2026-09-13)
7031b58 published normally; freshly fetched dev == origin/dev ==
7031b58bf8922d3c7edd7ccd26dca849318fb3f2, clean tree before this documentation update.
Final source release composition: full npm test 83/83, typecheck/build/harness,
strict required-build privacy zero. Startup smoke 1/1, standalone privacy/evidence
validator and diff checks pass. Docs-only checkpoint validated with harness/diff
checks and published next. No main/PR/Studio/deployment/external action/Phase 7.

## Phase 7 authorized scope (2026-09-13)
Baseline clean dev == freshly fetched origin/dev at e751f05. Before-edit mismatches and acceptance recorded in [Phase 7 matrix](phase-7-acceptance.md). Parent owns writes: shared lifecycle contract, owner server transitions, immutable application snapshot, conservative history analytics, corrections/idempotence, truthful UI and migration tests. No Phase 8, scoring mutation, main/PR/Studio/production deployment. Implementation underway; all completion gates and normal dev publication required.

## Phase 7 completed contracts (2026-09-13)
Shared strict runtime/TS status/event/snapshot/request contract replaces client
status/notes versus persisted from/to/note mismatch. Recoverable destination-only
legacy events get unknown predecessor and retained note/time; malformed/oversized
history stays private quarantine. No SQL migration. Existing lifecycle survives
ordinary saves and matching imports; new owner-selected backup history survives
export/import and disk restart. Browser cannot initialize hiring history via normal
workspace save or replace a stored lifecycle. Canonical server events have stable
IDs, durable effective/recorded timestamps, request keys and optional observation
metadata. Owner workspace row serializes transition/save transactions; event,
application, audit and revision commit or roll back together. Audit summaries omit
private notes/reasons. Retry/no-op writes do not append duplicate audit/history.

Forward stages may skip interviews. Backward/terminal reopening requires reasoned
append-only correction to an effective event; corrections can be corrected. Current
state derives from effective chronological history with append order for ties.
Older corrections preserve later terminal outcomes. Legacy state without established
history can be corrected/confirmed explicitly without deleting a job or inventing
application-time scores. First effective APPLIED supplies date; valid legacy date
survives postapplication progression/correction/archive. Removing established
APPLIED does not resurrect its date. At 5000 events new writes reject before commit.

First new application captures immutable current assessment algorithm, fit/coverage,
priority/recommendation/family/modifiers/fingerprint; stale or unassessed assessment
is unknown. Snapshot keeps application-time publication freshness, verification,
ATS/discovery source and actual selected application channel. Legacy application
scores are never reconstructed from current fit. Current reassessment is separate;
a corrected application instant that mismatches the stored snapshot is excluded
from historical score segmentation. Rejection reasons distinguish employer/recruiter,
owner observation/inference and unknown; absent text stays unknown. Manual outcome
source never fabricates email/connector ingestion. WITHDRAWN is not rejection;
OFFER is not acceptance; ARCHIVED preserves earlier observed outcomes.

Shared deterministic engine counts each explicit effective destination once per
application, no inferred hierarchy. Any interview is screen/hiring manager/technical/
final. Application counts need APPLIED or valid legacy submission date, not current
status. Interview/technical/offer rates use all recorded applications. Cohorts retain
snapshot family, unique modifiers, fit band + priority + version, actual application
channel, freshness, ATS and discovery source; unknown snapshots remain UNKNOWN /
LEGACY. Each cohort returns n/outcome counts/rates and n<5 insufficient, 5..14 early,
>=15 observed; none claims significance or causality. Medians require five valid
nonnegative timestamp pairs. [start,end) weekly event activity withholds conversion
rates. No Gemini, scoring coefficients, automatic learned labels or strategy tuning.

Pipeline lists every supported status and real Phase 5/6 readiness, exposes history
and separate current/application assessments, date/channel/note/source/rejection
provenance and correction UX with async error/retry handling. Analytics/Dashboard
consume shared counts. All hardcoded learned percentages/claims and false minimum
bars removed; private empty and synthetic demo are explicit. Public browser
APPLIED -> SCREEN -> REJECTED retained 1 application/1 interview/1 screen/1 rejection
with n=1 insufficient; reload retained synthetic history. Full authenticated browser
and deployed/live Neon transport are still external. No real private fixtures.

Initial full runs exposed prior operation-count and intentional legacy-history
replacement expectations; updated assertions preserve owner denial, collection/
resume replacement, removal and rollback and now assert durable application history.
One new date correction test expected ISO without milliseconds; canonical ISO value
assertion fixed. Reviewer correction/overflow/legacy-date reproductions all directly
verified resolved with regressions. No acceptance validator weakened.

## Phase 7 final local validation
Focused 12/12; final complete suite 95/95 (Phase 4/4.1/5/6 retained).
Final release:check passes typecheck/build/harness/tests/strict required-build
privacy zero findings. Standalone final privacy zero, both synthetic evidence
validators pass, final built startup smoke 1/1, db:generate no drift/migration
upgrade tests pass, git diff --check pass. Public synthetic browser stage/form/
analytics/reload checks pass; authenticated/deployed/browser/mobile rendering and
live Neon transport remain external, not inferred from local fixtures. Existing
>500 kB client warning remains, now 639.41 kB with shared runtime validation.
Boundary reviewer directly verified all four demonstrated defects resolved; no
remaining demonstrated defect in the bounded Phase 7 review. Checkpoint/push next.

## Phase 7 publication checkpoint (2026-09-13)
Implementation 46f5fa2 published by normal fast-forward from e751f05; fresh fetch
verified clean dev == origin/dev == 46f5fa2d5c2f18d0f92229682136005fa40fbc56.
Final source release composition passes full 95/95, typecheck/build/harness/strict
required-build privacy zero. Phase 7 12/12, startup smoke 1/1, standalone privacy,
both synthetic evidence validators, db:generate no drift and staged diff check pass.
Boundary reviewer directly confirmed all four demonstrated defects resolved; no
remaining demonstrated defect in the bounded review. Docs-only checkpoint follows
with harness/diff validation. No main/PR/Studio/deployment/Phase 8. Next exact step
is Phase 8 — Vercel-compatible architecture completion/live runtime acceptance,
separately authorized. All previous live limitations remain explicit.

## Phase 8 validation checkpoint (2026-09-13)

PARTIAL. Local Node 24.19.0/npm/Vite/Express adapter contract verified. Focused
10/10 and final full 105/105; release:check passes typecheck/build/harness/tests/
strict required-build privacy zero. Standalone final privacy/harness pass. Sentinel
server-env build/client scan passes: dist/client/index.html and two hashed assets,
3 files/706107 bytes; JS warning 639.41 kB unchanged. Local shell 182.8 kB is NOT
a Vercel Function bundle measurement. db:generate no drift; existing migration
upgrade/transaction/restart tests pass; both evidence ID validators pass; final
built startup smoke 1/1 and git diff --check pass. No prior acceptance gate weakened.

Adapter cleanup is once-only and bounded (290s transport deadline, 5s Pool close);
deadline/stream failures destroy transport, not append JSON. Remote abort/Pool
cleanup timeout does not prove cancellation. Closed request DB boundaries fence
late work; concurrent synthetic owner/data/error/artifact/DB tests and installed
Blob OIDC/static-fallback resolver checks pass. Auth static origin/cookies/exact
Origin stay intact; raw library provider logging disabled. Durable data remains
Neon/Private Blob; no career data persisted to Function filesystem.

| Live gate | Status | Evidence |
| --- | --- | --- |
| Vercel build contract | PENDING_EXTERNAL_CONFIG | Local build/config/adapter passes; no CLI/link; generated Function/routes/size pending |
| Vercel preview runtime | PENDING_EXTERNAL_CONFIG | Exact incoming rewrite paths and largest JSON responses unresolved; no preview deployed |
| Google OAuth | PENDING_EXTERNAL_CONFIG | Synthetic production hooks/cookies pass; live callback/browser pending |
| Neon live persistence | PENDING_EXTERNAL_CONFIG | Local transactions/upgrade/restart and Pool isolation pass; live transport/locking pending |
| Private Blob live persistence | PENDING_EXTERNAL_CONFIG | SDK 2.8 OIDC resolution/current-read/stream faults pass locally; live grant/CDN pending |
| Gemini live generation | PENDING_EXTERNAL_CONFIG | Prior structured synthetic contracts retained; no live request |

Function/Neon region pair, staging-specific Preview secrets/resources, authorized
nonproduction migration, private browser cookies and actual Vercel generated config
remain external gates. npm ci succeeded with authorized cache/network access after
sandbox cache failures; six moderate advisories remain for Phase 9. Historical
plan's four Windows-encoded em dashes normalized to UTF-8 without content loss.
No main/PR/Studio/production/Phase 9/resource mutation. Scoped commit/push follows.
Resolve the stated Phase 8 platform acceptance first; next separately authorized
phase: **Phase 9 — Security/privacy/release audit.**

## Phase 8 publication and clean-source reproduction (2026-09-13)

Implementation 743091e published normally from bec000b; fresh fetch verified clean
dev == origin/dev == 743091ea149abe155759d904fa2f861b4d939a20. Fresh Git archive
in a temporary checkout independently ran Node 24.19.0 npm ci, typecheck, all
105/105 tests, build and runtime scan with no .env/untracked files/global Bun.
Same hashed assets and client total 706107 bytes reproduced; six moderate npm
advisories and >500 kB warning unchanged. No actual Vercel CLI/live runtime/provider
acceptance inferred. Final docs-only checkpoint records reproduction/publication;
harness/diff checks and normal dev push follow. No main/PR/Studio/production/Phase 9.

## Phase 9 authorized audit (2026-09-13)
Baseline clean dev == freshly fetched origin/dev == b98a2a8. Scope and acceptance recorded before fixes in [Phase 9 matrix](phase-9-acceptance.md). Audit auth/ownership/files/SSRF/AI/import/history and release/supply-chain boundaries; parent owns writes, requested read-only security reviewer. No Phase 10/main/PR/Studio/deployment/remote migration. Phase 8 external gates remain PENDING_EXTERNAL_CONFIG and are not defects. Historical pre-fix scope entry; audit/remediation results are recorded in the validated checkpoint below.

## Phase 9 validated checkpoint (2026-09-13)
PARTIAL. Threat model and all boundary evidence/dispositions recorded in Phase 9
matrix. Auth/IDOR/files/SSRF: no demonstrated bypass in bounded code/synthetic
review. AI/import/input/budget findings fixed with adversarial regressions.
Current-source secrets/logging/bundle: strict zero; historical contact/seed
provenance remains UNVERIFIED and blocks unqualified Phase 10 readiness.
Full and production audits four accepted moderate loader-chain entries after
runtime qs fix; no high/critical advisory. Main-to-dev diff and additive migration
reviewed without main writes. Node24 npm ci/npm ls/full release 113/113 passed;
focused 24/24 (before final scanner fixture), smoke 1/1, no-drift/fresh/upgrade,
evidence validators and privacy/harness pass. Final source/doc/staged checks and
scoped checkpoint publication follow; no hash embedded for this checkpoint.
External Vercel/OAuth/Neon/Blob/Gemini gates PENDING_EXTERNAL_CONFIG.
Next exact phase: Phase 10 — dev → main pull request and merge readiness, only
after history disposition and new authorization; not begun.

## Phase 9 publication checkpoint (2026-09-13)

Implementation/audit ad08f97dd818cfda7a68a4358bdb0d8a549ce62c published normally
from b98a2a8. Fresh fetch verified clean dev == origin/dev == ad08f97; main and
origin/main remain18bde7f. Final staged current-source privacy/runtime scan and
startup smoke passed. All 113/113 tests and complete release composition passed;
four accepted moderate tooling-chain audit entries remain. Historical contact/
seed provenance remains UNVERIFIED; Phase9 PARTIAL, Phase10 readiness NO.
This docs-only publication record is checked and normally pushed next; its own
hash is verified in final report rather than embedded. No main/PR/Studio/Vercel
resource action/remote migration/Phase10. Next exact phase after history
privacy disposition and separate authorization: Phase10 — dev → main pull
request and merge readiness.

## Phase 9.1 completed provenance/disposition (2026-09-13)
Baseline df4edc9 recovered clean and equal to fresh origin/dev. Trace covers 27
commits/all 395 reachable textual blobs, including 5 legacy Windows-encoded text
objects; no binary media. Three flagged blobs are one email, five occurrences in
server owner defaults/legacy identity, browser login default and candidate/resume
seed. First18bde7f (Sep 11 initialization), last containing dev snapshot b12fd5b
(Sep 12 harness), cleared from dev in 41a04f8. Introduction predates privacy-boundary
1a620d6 and harness. Published origin/main/dev expose its ancestry; no other
fetched remote branches/tags. Main unchanged and still contains intended public
contact at its introducing tip. No additional historical propagation found.
Owner confirms real/current professional/job-search email deliberately published
on resumes, not synthetic, credential or private-workspace-only. All markers B /
INTENDED PUBLIC DATA. No rotation/history rewrite required for this value.
Exact blob/path confirmation registry contains no values/digests. New read-only
privacy:history emits neutral IDs/metadata, skips reserved fictional domains,
retains accepted findings and independently denies current reintroduction.
Current dev/defaults/tests/docs/client/server build marker occurrences zero;
strict privacy and runtime client scan pass. Relevant scanner regression 1/1;
full Node24 release composition passes 114/114, typecheck/build/harness/strict
privacy zero/runtime check. Final staged scan/diff and normal dev publication
follow; final SHA reported after fresh equality/clean verification.
Phase 9.1 PASS; Phase 9 final PASS; Phase 10 code readiness YES, not begun.
Live Vercel/OAuth/browser/Neon/Blob/Gemini PENDING_EXTERNAL_CONFIG unchanged.
No raw historical values printed/persisted; no main/PR/Studio/Vercel/remote
migration/rotation/history rewrite. Stop after checkpoint publication.

## Phase 10 authorized scope (2026-09-13)
Clean freshly fetched dev/origin/dev 24a5737537d92c7c51b5df2939a3352bcaead082; main 18bde7f451e4e5f39e303f82a0507a30233cd35e; 0 main-side /26 dev-side commits. Verify release delta, dependencies, migrations, deterministic gates and clean-source reproduction; create dev -> main PR and inspect readiness. Acceptance: phase-10-acceptance.md. No merge/main mutation, Phase 11, deployment or remote migration. External gates remain deferred.
