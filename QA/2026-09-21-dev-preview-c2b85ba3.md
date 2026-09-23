# CareerOS c2b85ba3 Regression QA

Date: 2026-09-21
Git SHA: `c2b85ba3d4f29fd5ca8001dcf45df21e974a2008`
Preview: https://job-board-resume-tailor-git-dev-soluke22s-projects.vercel.app/
Browser: Codex in-app browser (Public Demo)

## Deployment identity

PASS (with limitation) — local `dev` and `origin/dev` both resolve to the exact SHA above; `origin/main` remains `befa1282232e0fca880d78485c58ce34d2ff1308`. GitHub's combined commit status for the exact SHA was `success`, including a `Vercel` status of `success` targeting deployment `6q1JMwUfrxCH3P9GKoixHQZxLaDt`. The expected dev preview URL loaded the CareerOS app in the browser. The browser did not independently attest that the branch alias served that exact deployment.

## Browser evidence and reset blocker

The reused in-app browser retained modified Public Demo state from the preceding QA: profile `Jordan Taylor QA`, five jobs (including two prior synthetic QA jobs), four evidence records, and stale authored assessments. Public Demo Setup and the Demo Mode dialog exposed no reset control. This browser's available controls did not expose per-key localStorage or site-data deletion; developer-tools shortcuts did not expose a usable storage interface. No `caos_demo_*` key was removed, and no cookies, session state, `caos_priv_*` keys, or unrelated storage were touched. The required clean synthetic demo fixture was therefore not established. At the initial checkpoint, no regression actions were run and no product defect was inferred from this QA-environment blocker.

In the continued run, the existing Public Demo state was used for the independent corrected-workflow checks below. Fresh-fixture assessment compatibility remains blocked; the stale authored assessments were not repaired or treated as evidence for that gate.

| Regression | Result | Observation |
| --- | --- | --- |
| Demo assessed compatibility | BLOCKED | Clean demo reset unavailable; authored assessments were already stale after prior QA edits. |
| Search Preferences validation | PASS | Recorded the current valid 1,683-character JSON. `{ invalid json` stayed editable, showed `Unsaved changes` and `Invalid search preferences. Fix the JSON and try again.`, and did not show `Not saved — reload required`. A second tab still loaded the exact original canonical JSON. Restoring that exact JSON and saving showed `Saved in demo`; the validation error cleared. |
| Add Job partial success | PASS | Dashboard count rose from 5 to 6 after submitting `QA c2b85ba3 Partial Success 2026-09-21` / `Synthetic Frontend Engineer`. Owner-only analysis failed as expected; Add Job modal stayed open without navigation to detail. It showed `Job saved, but analysis failed. Retry analysis.`, `Retry analysis`, disabled company/title/URL/description and preset buttons, no URL-fetch action, and `Retry analysis uses the saved version.` |
| Same-ID retry / no duplicate | PASS (UI evidence) | One `Retry analysis` click left the count at 6, preserved the locked saved company/title/URL/description, and returned to the truthful partial-success modal after the expected owner-only failure. Internal ID was not browser-visible; no duplicate was observed. |
| Unassessed Job Detail | PASS | Fit and coverage displayed `—`; verdict displayed `ASSESSMENT PENDING`. Selling point, gap, claims withheld, and the requirements table said `Unknown until assessment completes.` No Apply/Borderline/Skip verdict, unsupported-claims reassurance, hard-blocker conclusion, or tailoring recommendation appeared. |
| Jobs list unassessed state | PASS | The new job row showed `Analysis pending`, `Fit & Evidence`, and `Run analysis`, without an Apply/Borderline/Skip badge or Tailor Studio action. |
| Reload coherence | PASS | Reload showed six total jobs and exactly one row for the new company/title. Its Jobs row remained `Analysis pending` with `Run analysis`; detail still showed `—` fit/coverage and `ASSESSMENT PENDING` with neutral unknown text. No retry duplicate appeared. This is browser-local demo continuity, not private durable persistence. |
| Console | BLOCKED | The in-app browser did not expose console-log instrumentation. No page crash was visible during the exercised flows; React warnings, uncaught exceptions, and duplicate-key warnings could not be audited. The expected owner-only analysis failure was visible in UI and is not classified as a regression. |

## Remaining previously blocked gates

Carried forward without retesting: private authenticated browser flows; READY tailored Quick Grab browser path; clipboard rejection; deterministic in-flight timing where unavailable; exhaustive network inspection where unavailable. None is marked PASS.

## Final regression result

Corrected workflow regression retest: PASS for Search Preferences, Add Job partial success, same-job retry/no duplicate, unassessed detail, Jobs list, and reload.
Overall regression retest: PARTIAL — fresh-fixture demo assessment compatibility and console inspection remain blocked by QA-environment capabilities.
Remaining BLOCKER/HIGH in corrected scope: 0 demonstrated by the exercised browser workflows; fresh-fixture assessment compatibility remains unverified, not PASS. No product defect was inferred from unavailable reset or console tooling.
