---
name: workspace-security
description: Implement or review OAuth, authorization, sessions, PII, ownership and private files.
---
# workspace-security
## Load
Read docs/PRIVACY_BOUNDARY.md and relevant docs/ARCHITECTURE.md section from repository root; resolve docs links relative to root, not this directory.
## Relevant modules
server/auth.ts, server/workspaceRoutes.ts, server/workspaceRepository.ts, server/privateFiles.ts, server.ts, API/storage/AppContext (confirm existence in the active checkout).
## Procedure and invariants
Trace verified identity to every authorized record/file operation; frontend hiding is not authorization. Inspect pending local changes before relying on them. Preserve fail-closed behavior and demo isolation. Use a security-reviewer after a meaningful boundary diff.
## Validation
npm run typecheck; npm run build; available focused auth tests and denial/manual OAuth scenarios in TESTING. Live credentials are not needed for synthetic tests.
## Completion
Missing/invalid/non-owner/revoked access denied, owner access works, private outage never substitutes demo.
