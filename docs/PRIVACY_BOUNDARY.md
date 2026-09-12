# Privacy boundary

## Public and private
Public: source code, generic schemas, intentionally synthetic fixtures, static UI
and non-secret configuration examples. Private: actual candidate/contact records,
career evidence, imports, resumes, jobs/applications, interviews, outreach, audit
records, private source files and exports. Never copy private contents into docs,
tests, screenshots, logs or public artifacts.

## Current State — Phase 1 implementation
Better Auth provides Google OAuth only. Email/password is disabled. The current
Google profile, user creation and session creation must match the server-only
OWNER_EMAIL with verified email. No email-only login or bearer/query-token
middleware remains. Browser flags are UI state, never authorization.

Required server configuration is OWNER_EMAIL, DATABASE_URL, BETTER_AUTH_SECRET
(at least 32 non-padding characters), BETTER_AUTH_URL and Google client ID/secret.
BETTER_AUTH_URL must be one canonical origin, HTTPS except local development.
Missing/invalid configuration denies private access. Exact-origin mutation checks
apply to private APIs and auth mutations; Better Auth validates OAuth state and
callback URLs. Previews need their own explicitly configured origin and registered
Google callback; arbitrary preview/wildcard origins are not trusted.

Sessions use the Drizzle database adapter, opaque signed HttpOnly cookies,
SameSite=Lax, HTTPS Secure cookies, one-day expiry and hourly renewal. Cookie
session caching is disabled so every private authorization reads server session
state. Invalid, expired, missing, unverified and non-owner sessions deny access.
Account linking is disabled and identity updates are blocked. A Better Auth
before-sign-out hook uses its session adapter to revoke before the library can
swallow a deletion outage; failure returns 503 and the client offers retry.

Workspace read/write/import/export/audit inherit a scoped owner router. Private
file list/upload/download/delete use the owner guard directly, owner-scoped
metadata queries, private Blob storage and authorized attachment streaming.
File reconciliation uses the same guard/origin check and owner-qualified durable
upload intents. Pending/abandoned uploads are not API file metadata. Recovery never
deletes an object with saved metadata; closed serverless DB boundaries deny late work.
All remaining application APIs (candidate context, evidence, resume, Gemini,
search, jobs/ATS, proof, outreach, answers and referral) inherit /api owner
middleware. Only health and configured Google auth flows are public API surfaces.
Private/auth/file/export responses carry private, no-store cache semantics.

Private browser records and session UI metadata are held in memory. Demo records
use a separate synthetic source and public browser keys. Private defaults are
blank and an empty authorized workspace opens candidate setup. Restore reads the
server session then the workspace; a private read error never hydrates demo data.
401/403/503 and network failures remove private UI/cache access. Logout invalidates
outstanding requests immediately; failed server revocation is explicit and
retryable. Server session expiry schedules local clearance; session checks run
every 30 seconds and on focus/visibility restoration. Generation checks reject
stale workspace/export/AI responses after session or workspace transitions.
Switching to the public demo is an explicit view change; it does not revoke the
server session. Returning private still requires server authorization for APIs.

## Acceptance and limitations
Phase 1 deterministic results and security-review disposition are recorded in
[Phase 1 acceptance](exec-plans/active/phase-1-acceptance.md) and the
[active plan](exec-plans/active/productionization.md).
Live Google OAuth acceptance pending external configuration.
Synthetic adapter/session tests prove architecture and denial behavior; they do
not prove live Google, Neon, Blob or deployed cookie behavior. Phase 2 durable
database/private file contracts have local synthetic restart/transaction/ownership
and failure/retry tests. Live Neon/Blob and multi-connection behavior remain pending.

Legacy private browser data is read only through explicit owner import preview;
originals remain on the device until the user removes them. New private/auth
records are never written to localStorage. Privacy redaction exists, but free-text
minimization, semantic evidence provenance and SSRF remain later acceptance work.
No service worker/static cache stores real private records. No credentials belong
in browser-prefixed variables, public bundles or repository files.

## Required ongoing boundary
Every record/file query must carry server-derived ownership; cross-owner IDs must
not disclose contents. Private operations fail closed under auth/storage outages.
Only necessary approved evidence may reach AI; never log raw career evidence,
resumes, secrets or session tokens. Imports require bounded type/schema checks
and provenance review; exports are private JSON, not encrypted backups.
See [TESTING.md](TESTING.md) for validation and live acceptance limits.

## History
The pre-reconciliation baseline used email-only process tokens, bearer/URL token
acceptance and private localStorage defaults. Those descriptions are historical,
not current dev behavior. Inherited integrations were committed in 41a04f8;
stale persistence fixtures were corrected in 0828816. Phase 1 audited and fixed
the committed implementation without replacing Better Auth.
