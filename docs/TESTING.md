# Testing

## Current state and commands
Use npm ci with package-lock.json. Historical bun.lock is not the install source.
The committed node:test suite runs through tsx; PGlite tests workspace contracts.

- npm test: complete deterministic suite.
- node --import tsx --test tests/auth-security.test.ts tests/phase-1-auth.test.ts tests/phase-1-client.test.ts: focused Phase 1 acceptance.
- npm run typecheck: TypeScript (lint is an alias).
- npm run build: Vite client and esbuild server; existing chunk warning is tracked.
- npm run harness:check: router/doc/skill/agent integrity and negative fixtures.
- npm run privacy:scan: bounded source/client artifact privacy triage; use
  --strict --require-build at release. Paths/rules only, no matched private text.
- node scripts/validate-evidence.mjs <synthetic-json-file>: evidence reference
  integrity; ID validation does not prove semantic candidate provenance.
- npm run release:check: typecheck, build, harness, strict public-artifact privacy
  scan and complete test suite. Never weaken validators to obtain a passing gate.
- git diff --check and scoped source/untracked diff review before committing.

## Phase 1 deterministic coverage
The inherited auth-security tests cover guard identity denial, mutation origin,
private file ownership/validation and isolated library sign-out.
phase-1-auth tests use the exact production Better Auth options/hooks with a
synthetic memory adapter, real signed cookies, real session lookup, owner session
creation, expiry/revocation, logout adapter failure, secure cookie attributes,
callback rejection and canonical OAuth redirect generation. Provider-profile
checks do not mock Google token verification into success; live Google is pending.
Installed Express route inventory plus actual HTTP requests cover every private
application/file API and workspace read/import/export/audit denial, no-store and
missing database behavior. Invalid expiry and auth-service errors fail closed.

phase-1-client tests run real API/storage modules with controlled transport delays
and synthetic browser storage/events. They cover memory-only records, distinct
blank private/synthetic demo sources, 401/403/503/network loss, stale workspace,
export/AI replies and old-network-failure races. Lifecycle wiring inspection is
supplementary, not proof of rendered authenticated OAuth browser behavior.

No credentials/private career records are used in these fixtures. Live Google
OAuth acceptance pending external configuration. External live credentials,
Google consent/registered callback, Neon schema and deployed Secure cookie behavior
must be tested separately. Phase 2 persistence acceptance remains pending even
though the inherited PGlite workspace contract test passes.

## Remaining gates
Security: live OAuth redirect/state/callback, cross-owner persistence, auth/DB/Blob
outages, durable restart and hosting; SSRF/private network redirect safety later.
ATS: exact posting status, removed/unknown/error URLs, freshness and deduplication.
Evidence: unsupported/JD-derived/cross-owner claims, manual invalidation and export.
Integration: full authenticated browser lifecycle and truthful end-to-end workflows.
Use synthetic Gemini/ATS/provider fixtures by default. Never log secrets or raw
private workspace records. Build/static scanning cannot certify complete privacy.
Results and reviewer findings belong in the active plan and Phase 1 acceptance.
