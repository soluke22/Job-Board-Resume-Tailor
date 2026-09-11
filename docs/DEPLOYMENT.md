# Deployment
## Current state (2026-09-11)
The repository builds a Vite static client and an esbuild CommonJS server bundle in dist. Express starts a long-running listener on port 3000.
No Vercel configuration, Next.js application, database schema/migrations, auth provider integration or file storage implementation is checked in.
.env.example describes an AI Studio/Cloud Run environment; this is not evidence of an active deployment. No live deployment was inspected.
Sessions, workspace/audit data and analysis cache are process-local; client records live in localStorage. A DATABASE_URL comment is not database integration.
Production startup needs a separate smoke test: server.ts uses import.meta.url while build emits CommonJS.

## Desired Vercel architecture
Serve public demo assets independently of authenticated workspace operations. Use server-side routes/functions for auth, authorized data access, AI and ATS.
Use durable Postgres (Neon candidate) with migrations (Drizzle candidate), verified auth (Better Auth candidate) and private object storage (Private Blob candidate). These technologies are requested migration options, not installed dependencies.
Next.js is conditional on migration selection. Do not treat a framework rewrite as part of harness creation.
Persist ownership and provenance with data; never rely on process memory across function invocations. Authorize file access before issuing delivery URLs. Separate preview/production data and credentials.
Before deployment, implement and pass privacy and security gates in [PRIVACY_BOUNDARY.md](PRIVACY_BOUNDARY.md) and [TESTING.md](TESTING.md).

## Environment inventory
| Variable | Current use |
| --- | --- |
| GEMINI_API_KEY | Server Gemini client; missing key returns unavailable on AI operations |
| OWNER_EMAIL | Server owner comparison; currently has an unsafe embedded default |
| NODE_ENV | Selects Vite middleware vs production static serving |
| DISABLE_HMR | Vite HMR/watch toggle |
| APP_URL | Documented in .env.example; not consumed by application code |
| DATABASE_URL | Mentioned in a server comment only; no implementation |
Future auth, OAuth and private storage secret names must be documented when the integration is selected. Keep all credentials server-only and use placeholders in examples.

## Migration tracking
Phase 1 changes documentation/routing only. The user subsequently defined Phase 2: verified owner-only access, public/private data isolation, durable private persistence and file storage, correct ATS discovery/freshness/deduplication, evidence-grounded ranking and claim provenance, grounded application artifacts, structured Gemini validation, tracking/analytics, API/URL security, and Vercel deployment. Preserve the existing UI and synthetic demo. The latest instruction limits current delivery to Phase 1; no Phase 2 implementation is included in this harness change.
Update this document with selected framework/provider, migration commands, environment requirements, deployment verification and rollback procedure when later phases implement them. Do not claim production readiness from a successful build alone.
