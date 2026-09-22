# Dev Preview private-auth browser acceptance — 2026-09-22

Stable preview: https://job-board-resume-tailor-git-dev-soluke22s-projects.vercel.app/

Scope: UI-level acceptance of the dev Preview private-auth flow for commit `2378b6f9e43fe37dad94b8ac630f87507436b7a4`. No private workspace mutations were performed.

| Gate | Result | Browser observation |
| --- | --- | --- |
| Public Demo entry | PASS | The stable branch preview loaded the Jordan Taylor synthetic fixture. |
| Google authorization | PASS | CareerOS `Continue with Google` reached the normal Google account chooser without `redirect_uri_mismatch`. The owner completed sign-in manually. |
| Google callback and owner login | PASS | The browser returned to the stable CareerOS origin in Private Workspace. `Authenticated Owner Active` and the configured owner were shown. No redirect loop or visible auth error appeared. |
| Private Workspace | PASS | A new, empty private workspace loaded, without Jordan Taylor or other Public Demo records substituted. |
| Read-only navigation | PASS, with UI limitation | Dashboard, Setup, Pipeline, Evidence, and Master Resume rendered in Private Workspace. The empty private records remained consistent across views. |
| Reload persistence | PASS | One normal reload restored Private Workspace and `Authenticated Owner Active` without another Google login or Public Demo fallback. |
| Sign-out | PASS | `Lock & Sign Out of Private Workspace` returned the UI to Public Demo with Jordan Taylor visible. The authenticated-owner state disappeared. |
| Post-sign-out reload | PASS | One normal reload remained in Public Demo, with no private data visible or silent private-session restoration. |

Visible auth errors: None. No `Invalid request origin`, `Private authentication is unavailable`, or `Unexpected end of JSON input` appeared.

Browser defect observed: The `Workspace Security & Access` modal remained visible after Escape and an outside click; a normal reload cleared it before read-only navigation. This did not prevent completion of the auth, persistence, and sign-out gates, but modal dismissal merits UX follow-up.

Result: `PRIVATE_AUTH_PASS` with the modal-dismissal limitation above. No source, schema, or configuration changes or direct database operations were performed during this QA run. Only the normal auth-session login/sign-out lifecycle occurred. No private workspace data was edited, imported, exported, uploaded, copied, or generated.
