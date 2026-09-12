# Deployment

Reconciliation update (2026-09-12): descriptions of pending/uncommitted work and
5/6 test results below are historical Phase 0 snapshots. All inherited product
work is preserved in 41a04f8; stale test fixtures corrected in 0828816. Final
suite passes 6/6. Use npm ci with package-lock.json. See
[reconciliation record](DEV_RECONCILIATION.md) and active execution plan for
current state; preserved integrations still require production acceptance.
## Current State
Committed baseline uses Vite + Express in server.ts and a CommonJS server build.
Inherited uncommitted work separates server/local.ts and api/index.ts, builds
dist/client plus ESM dist/server.mjs and adds vercel.json, Better Auth,
Neon/Drizzle migrations and private Blob. No production deployment is certified.
See active plan and Git status; pending code is not a completed production phase.

## Target State
Durable owner-scoped Postgres and private file access, server-only model/auth
credentials, explicit outages and authorization on private operations.
Next.js migration remains conditional; do not introduce it solely for hosting.
Keep public demo synthetic and private data absent from source/client artifacts.

## Migration Notes and configuration
Working-tree .env.example names GEMINI_API_KEY, DATABASE_URL,
BETTER_AUTH_SECRET, BETTER_AUTH_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
OWNER_EMAIL and BLOB_READ_WRITE_TOKEN. Never include their values in docs.
Committed package/env baseline differs until pending product work is reviewed.
Better Auth origin/Google callback must match configured client and target;
use current provider docs before provisioning. Migrations require reviewed
schema and explicitly authorized database target; don't run them for Phase 0.
Validate local production startup, owner session and DB/file persistence;
Vercel previews can support later phases. Restore a known good Git revision
and use provider-specific reviewed migration recovery rather than data deletion.

## Production order
All phases converge on dev → full release/security audit → dev/main PR → merge
→ Google AI Studio pulls main and verifies load/UI/Gemini/synchronization and
public/private UX → compatibility fixes through GitHub → main stable →
finalize Vercel production. See DEVELOPMENT_WORKFLOW for Studio responsibilities.
No main PR, merge or production deployment belongs to Phase 0.
