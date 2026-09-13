---
name: vercel-deployment
description: Handle Vercel runtime compatibility, Better Auth, Neon/Drizzle, private Blob and environment configuration.
---
# vercel-deployment
## Load
Read docs/ARCHITECTURE.md, docs/PRIVACY_BOUNDARY.md and docs/DEPLOYMENT.md from repository root; resolve docs links relative to root, not this directory.
## Relevant modules
package.json, api/index.ts, server/local.ts, server/db, migrations, auth/privateFiles, vercel.json and .env.example (confirm existence in the active checkout).
## Procedure and invariants
Confirm chosen framework/provider and current official API behavior using docs-researcher when useful. Preserve server-only secrets and durable owner scoping. Do not finalize production before merged main and AI Studio verification; previews may support future validation.
## Validation
npm run typecheck; npm run build; focused migration/persistence/security tests plus startup/preview smoke. Do not run remote migrations without authorized target.
## Completion
Runtime and persistence verified at intended stage; failures explicit, production ordering respected.
