# Dev-preview onboarding browser QA — b06959d

Date: 2026-09-22. Scope: focused UI acceptance on the stable `dev` branch preview, using only disposable synthetic values. No source, deployment configuration, production, or main changes were made during QA.

## Deployment identity

- `origin/dev`: `b06959d1fa7eda4ba8db425d2fdceb84939b8c94` after a normal non-force push of the two reviewed onboarding commits.
- `origin/main`: `befa1282232e0fca880d78485c58ce34d2ff1308` (unchanged).
- GitHub commit status for the exact dev SHA reported `Vercel: success`. The stable branch preview loaded. Its served asset filenames, `index-OvPx-lzk.js` and `index-7hKhGEv4.css`, matched a fresh local build at that SHA.
- Limitation: direct Vercel deployment metadata for the stable alias was not available in the browser. Commit status plus asset fingerprints support, but do not independently attest, the alias's deployment SHA.

## Browser results

| Gate | Result | Observation |
| --- | --- | --- |
| Owner login and private isolation | PASS | Fresh `Continue with Google` initiation reached the normal account chooser. The user completed credentials manually. CareerOS returned to the stable preview in Private Workspace; the configured owner was active and Jordan Taylor Public Demo records were not substituted. The agent did not enter credentials, complete MFA, or use OAuth state or tokens. |
| Empty private onboarding | PASS | Candidate Profile, Search Preferences, Master Resume/Evidence, Projects, Skills, and Pipeline steps were readable. The guide showed `Not started` for empty sections and explicitly stated that record counts do not verify claims, skills, or evidence. |
| Structured preferences | PASS | A synthetic Search Profile was saved with `preferredRoleFamilies: ["frontend", "legacy-family"]`. Editing only the structured hybrid-location field retained both values. Toggling the known `Frontend product` option retained the unknown values and added `frontend-product`. |
| Unknown-value preservation | PASS | Advanced JSON showed `frontend`, `legacy-family`, and `frontend-product` after the known-option toggle; the unknown values remained after durable Save and reload. |
| Advanced JSON Apply | PASS | Applying edits to structured `hybridLocations` and unrelated `preferredModifiers` updated the visible location control. A later structured onsite-frequency edit retained the unrelated modifier. Reload before Save reverted those applied edits, proving Apply alone did not persist. |
| Malformed JSON | PASS | Malformed Advanced JSON produced local validation. Clicking Save while the editor was open showed `Apply or discard Advanced JSON edits before saving`; it did not silently save stale data. |
| Durable Save/reload | PASS | The valid synthetic full profile saved with `Saved privately`. Reload restored the location, onsite frequency, known option, unknown role-family strings, and unrelated modifier. |
| Import preview non-mutation | PASS | A small local JSON fixture previewed three individually selectable synthetic records: profile, evidence, and project. Selecting evidence enabled confirmation without importing it. Navigation to the Evidence Bank still showed zero records. No import confirmation occurred. |
| Import provenance and warning | PASS | Each preview choice displayed the import filename, record-declared synthetic source, destination, and trust warning. Evidence was described as untrusted and requiring Evidence Bank review; project presence did not imply verification. |
| Synthetic import | NOT TESTED (optional) | Confirmation was deliberately skipped to avoid creating records without a demonstrated safe UI cleanup path for all fixture types. No synthetic profile, evidence, or project was imported. |
| Evidence review-required after import | NOT TESTED | The preview warning was verified, but no post-import evidence state was claimed. |
| Post-import navigation | NOT TESTED | No import was confirmed. |
| Projects/Skills empty states | PASS | Both pages said no records currently exist and directed the owner to selective import. Neither claimed the candidate had no projects/skills or that records were verified. |
| Synthetic cleanup | PASS for created values | The Search Profile was restored through the UI to its original empty/default field values and reload confirmed that state. No import records were created. An empty/default Search Profile was persisted during cleanup, with no synthetic values. |
| Public Demo isolation | PASS | Normal sign-out returned to Jordan Taylor Demo Mode with canonical synthetic fixtures and no private synthetic values. Reload remained in Demo Mode; the stable root URL showed no private content. |

## Browser observation and limits

- After sign-out, reloading the leftover `?workspace=private` URL showed the misleading notice `Private sign-in was not accepted. Continue with the configured owner Google account.` Public Demo remained active and no private data appeared. Navigating to the stable root URL cleared the notice. This is a minor sign-out/deep-link messaging issue, not an isolation failure.
- No browser crash or preference/import regression was demonstrated in the exercised paths.
- The temporary synthetic JSON fixture was removed locally after preview. No private evidence was approved, no AI action was invoked, and no private candidate/job/application records were created.
- Remaining synthetic preview data: no synthetic values or imported records. The default/empty Search Profile was saved during cleanup.

Result: `ONBOARDING_PASS` for the required onboarding, preference, preview, empty-state, and isolation gates, with optional post-import gates untested and the minor sign-out URL notice documented above.
