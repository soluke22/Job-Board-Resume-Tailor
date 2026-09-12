# Privacy boundary
## Public and private
Public: source code, generic schemas, intentionally synthetic fixtures, static UI and non-secret configuration examples.
Private: actual candidate identity/contact records, career evidence, imports, resumes, job/application history, interviews, outreach, audit records and exports. Do not copy their contents into docs, tests, screenshots, logs or public build artifacts.

## Current State — committed baseline and violations
- `server.ts` login compares email with OWNER_EMAIL but ignores passwordOrToken. Anyone knowing that email can obtain a token. This is not verified authentication or OAuth.
- Owner middleware protects workspace/audit routes using process-local tokens with seven-day expiry. Tokens are accepted from bearer headers or query strings; URL tokens risk logging/leakage.
- `src/services/storage.ts` stores auth metadata and candidate data in localStorage; AppContext's UI mode gate is not authorization.
- `src/data/privateSeedTemplate.ts`, AuthModal, storage exports and server prompts contain actual identity or career assumptions. Client defaults are bundled. Do not repeat these values in new documentation.
- AI routes generally accept caller-supplied candidate context without owner middleware. Claimed anonymization does not reliably remove PII from free text.
- No database ownership enforcement or private file storage exists. Workspace exports are plain JSON, despite a comment mentioning encryption.

## Target State — required boundary
Authenticate with verified identity provider credentials, validate OAuth state/PKCE and callback origins as appropriate to the selected integration, and authorize an explicitly configured owner server-side. Missing owner/auth configuration denies private access.
Use server-validated sessions, secure HttpOnly cookies with suitable SameSite/CSRF protections, expiration and revocation; do not trust browser isOwner flags.
Check ownership on every record, AI operation involving private records, and file upload/read/download/delete. Cross-owner identifiers must not disclose existence or contents.
Keep demo data on an explicit separate path; a failed private read must never become a successful demo read. Empty private setup must contain no real candidate defaults.
Only send necessary approved evidence to AI; redact identifiers and inspect free-text fields. Never log secrets, session tokens, full resumes or raw evidence.
Store private files outside source/public assets, with server-authorized access and bounded signed delivery where needed. Imports require type/size/schema validation and provenance review; exports remain private.
Keep provider keys, auth secrets, database credentials and storage tokens server-only. Never put them in browser-prefixed variables or bundles.
Logout must revoke the server session and clear private UI/cache access. Storage failures must be explicit.
See [TESTING.md](TESTING.md) for security acceptance gates.

## Migration Notes — pending working tree
Inherited local auth.ts requires configured origin/owner/secrets, verified owner
identity, Better Auth sessions, owner guard and mutation origin checks.
Workspace DB queries and private file routes carry owner scope. Private browser
cache is in memory; seed template is blank; legacy imports require review.
privacy.ts redacts identifiers, but free-text minimization is not certified.
These pending changes supersede baseline implementation descriptions only after
review and commit. Five synthetic auth/file/session checks pass; persistence
test fails. OAuth live flow, SSRF and full route authorization remain audit gates.
