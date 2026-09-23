# Dev Preview auth-error/modal regression — 2026-09-22

Stable preview: https://job-board-resume-tailor-git-dev-soluke22s-projects.vercel.app/

Scope: Focused UI regression for commit `1b6741f8c81c6904be8ced4de3fc57121eccbd70`, covering modal dismissal in Public Demo and authenticated Private Workspace, plus visible error handling during the normal auth flow. No failure was artificially induced.

## Deployment identity

PASS, with limitation. GitHub's Vercel commit status for the exact SHA was successful. The stable branch alias served the same content-addressed JavaScript (`index-BfMQxZPJ.js`) and CSS (`index-CDudnHIo.css`) asset names as the local build at that SHA. Direct Vercel deployment metadata was unavailable to this session (scope authorization denied); the asset comparison establishes the served build fingerprint, not independent Vercel metadata attestation.

## Browser observations

| Gate | Result | Observation |
| --- | --- | --- |
| Public Demo Escape | PASS | `Workspace Security & Access` closed on Escape; the Jordan Taylor Public Demo remained active. |
| Inside-dialog click | PASS | Clicking the dialog title/body did not dismiss it. |
| Public Demo backdrop | PASS | Clicking outside the dialog closed it. |
| Cancel | PASS | Cancel closed the dialog. No dismissal switched mode, authenticated, signed out, or cleared the visible demo fixture. |
| Google login | PASS | `Continue with Google` reached the normal account chooser on the stable dev origin. The owner completed account selection/login manually; CareerOS returned to Private Workspace. |
| Authenticated modal dismissal | PASS | `Authenticated Owner Active` was visible. Escape and backdrop each closed the modal while Private Workspace remained active; reopening confirmed the configured owner remained signed in. |
| Sign-out | PASS | `Lock & Sign Out of Private Workspace` returned to Jordan Taylor Public Demo. The access modal reported Public Demo Mode Active, not an authenticated owner; the stable root remained Public Demo. No private data remained visible. |
| Visible parser errors | PASS for exercised normal flow | No raw `Unexpected end of JSON input`, other parser error, or arbitrary HTML/non-JSON response body appeared in the UI. Empty/non-JSON failure behavior was not intentionally induced in the browser; automated regression tests cover those cases. |

Browser defects demonstrated: None in these focused checks. This run did not exercise exhaustive network failures or broader private workflows.

No source, configuration, or direct database changes were made after the push. No private workspace record was edited, imported, exported, uploaded, copied, or generated. Only the normal owner login/sign-out session lifecycle occurred.
