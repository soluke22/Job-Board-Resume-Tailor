# Architecture
Baseline inspected 2026-09-11. “Current” describes code; “target” describes required future behavior.

## Current State — committed baseline
React 19 renders through `src/main.tsx` and `src/App.tsx`. AppContext coordinates candidate setup, discovery, analysis, evidence matching, gap interviews, tailoring, evaluation, and application tracking. Components and views present those workflows.

`src/services/storage.ts` persists workspace records and auth metadata in localStorage with separate demo/private key prefixes. It imports both synthetic demo data and private defaults into the browser graph. `src/services/api.ts` sends JSON to Express routes in `server.ts`.

Express serves Vite middleware in development and dist assets in production, listening on port 3000. The server owns Gemini calls, prompt construction, URL fetching and ATS requests. Most AI routes accept candidate context supplied by the client; server-side ownership and evidence validation are incomplete. JSON fence stripping/parsing is not semantic validation.

Data flow: browser records -> AppContext -> API client -> Express -> Gemini or ATS -> JSON response -> browser state/localStorage. Private workspace and audit endpoints separately store data in process memory; there is no implemented database synchronization. Sessions and analysis cache also live in memory.

## AI and ATS boundaries
Gemini is initialized server-side using GEMINI_API_KEY. Discovery uses Google Search through Gemini. Analysis, matches, plans, resumes, letters, evaluations, proof packs and outreach are generated through API routes.
AI output must remain untrusted until validated; prompts alone do not enforce truth.
ATS adapter details and discovery gaps belong in [JOB_SEARCH_PIPELINE.md](JOB_SEARCH_PIPELINE.md).
Claim contracts and validation gaps belong in [EVIDENCE_MODEL.md](EVIDENCE_MODEL.md).

## Target State
Keep public synthetic demonstration isolated from authenticated candidate workflows. Server operations derive identity from verified sessions, authorize every record/file operation, retrieve approved owner evidence, validate generated claims, and persist records durably.
Move route orchestration out of the monolithic server into auth, workspace, discovery, evidence and tailoring modules as migration scope requires; those modules are not present in the committed baseline.
The desired Vercel deployment uses durable Postgres and private file storage. Next.js remains conditional, not an implemented or selected migration. See [DEPLOYMENT.md](DEPLOYMENT.md) for boundaries and outstanding decisions.
Client state becomes a view/cache of authorized server records, not an authentication or persistence authority. Model and ATS calls stay server-side. Database failure, invalid sessions and missing evidence yield explicit errors or empty authorized state, never synthetic replacements.

## Related contracts
[PRODUCT_INVARIANTS.md](PRODUCT_INVARIANTS.md) defines product behavior.
[PRIVACY_BOUNDARY.md](PRIVACY_BOUNDARY.md) owns security requirements and known violations.

## Migration Notes — pending working tree
On 2026-09-12 inherited uncommitted work adds server/auth.ts (Better Auth),
server/db (Neon/Drizzle), workspaceRepository/workspaceRoutes, privateFiles
(Private Blob), privacy redaction, server/local.ts and api/index.ts.
The working-tree build outputs dist/client and dist/server.mjs; Vercel config
routes API calls to the server adapter. storage.ts keeps private cache in memory
and legacyImport handles old browser data. These changes are pending review,
not completed phases. Consult Git status and active plan before relying on them.
