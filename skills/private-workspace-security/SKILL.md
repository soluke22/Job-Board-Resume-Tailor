---
name: private-workspace-security
description: Implement or review authentication, authorization, sessions, PII and private storage isolation.
---

# private-workspace-security

## Load
Read [PRIVACY_BOUNDARY.md](../../docs/PRIVACY_BOUNDARY.md); inspect only relevant auth/data paths.

## Workflow and completion
Start at server.ts owner/session routes, AppContext, services/api.ts and services/storage.ts; inspect AuthModal or src/data only when the boundary reaches them. Trace identity from request to authorized record/file access. Frontend hiding is never authorization. Implement the smallest complete server-enforced boundary and update the privacy doc when a recorded gap is closed. Completion requires denial cases and demo/private isolation verified.

## Validation
Run npm run lint, npm run build and relevant security acceptance checks from [TESTING.md](../../docs/TESTING.md); report absent suites.
