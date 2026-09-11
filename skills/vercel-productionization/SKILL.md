---
name: vercel-productionization
description: Migrate server, auth, database and private storage boundaries for Vercel deployment.
---

# vercel-productionization

## Load
Read [ARCHITECTURE.md](../../docs/ARCHITECTURE.md), [PRIVACY_BOUNDARY.md](../../docs/PRIVACY_BOUNDARY.md) and [DEPLOYMENT.md](../../docs/DEPLOYMENT.md).

## Workflow and completion
Inspect package.json, server.ts, vite.config.ts and .env.example plus the specific modules being migrated. Confirm selected framework/provider before relying on its API; consult current official provider documentation when implementing. Replace process-local authoritative state with durable owner-scoped storage. Preserve public UI/demo behavior and server-only secrets. Update deployment commands, variables and current state as changes land. Completion requires production startup/deployment verification and durable authorized data; build success alone is insufficient.

## Validation
Run npm run lint, npm run build, production smoke and relevant security/integration checks from [TESTING.md](../../docs/TESTING.md); use updated commands if migration changes scripts.
