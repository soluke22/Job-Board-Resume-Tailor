# Testing
## Current State
Committed baseline has lint (tsc --noEmit) and Vite/esbuild build, no product
tests. Inherited uncommitted package/tests add node:test with tsx and PGlite.
Phase 0 adds only script aliases and deterministic harness/triage validators.

## Commands
- bun install --frozen-lockfile: only when dependencies are needed. Prior Bun
  1.3.13 couldn't read tracked lock version 2; pending package-lock/dependencies
  differ from committed bun.lock. Resolve package manager in a later phase.
- npm run typecheck (same TypeScript check as npm run lint).
- npm run build.
- npm run harness:check: router links, skill metadata/doc/module paths, agent
  TOML keys/model/effort/read-only policy, concurrency and plan integrity.
- npm run privacy:scan: scans src, server, server.ts and dist/client when present
  for non-synthetic emails, credential literals and high-risk private seed strings.
  Only paths/rule labels printed. Warnings require review; not a complete PII audit.
  Use --strict to fail on privacy triage findings; use --require-build at release.
- node scripts/validate-evidence.mjs <synthetic-json-file>: explicit evidence
  array plus records; evidence reference IDs must resolve to verified enabled
  evidence. No default private reads; ID validation is not semantic provenance.
- npm run release:check: type/build/harness, strict public-artifact scan and
  npm test when an actual test script exists; missing suites remain explicit.
- Pending tests: npm test, or node --import tsx --test tests/auth-security.test.ts.
  No test:ats/test:security aliases until committed suite coverage supports them.
- git diff --check, git diff --stat and scoped diff review (include untracked files).
- Local production smoke: NODE_ENV=production then npm start; health and UI.
  Configure server-only values manually; no paid/live providers by default.

## Results (2026-09-12)
Inherited working tree: npm run lint pass; npm run build pass (531.60 kB chunk
warning); npm test five pass, one fails in workspace.test.ts at repo.save:
Invalid workspace or revision. Failure reproduced before harness edits.
Dependency install unnecessary: installed modules supported type/build/tests.
Harness validators include negative fixtures; final results are in active plan.
A passing harness is not a production release verdict.

## Target State — required future coverage
Security: anonymous/forged/expired/revoked/non-owner access denied; OAuth
state/callback/origin; cross-owner records/files; auth/DB/storage outages;
logout; no private data in public artifacts; private network/redirect SSRF.
ATS: synthetic exact active/removed/board-only/error URLs, dedupe within/across
batches, unknown/invalid/future dates and supported blockers.
Evidence: rejected/disabled/cross-owner/unknown IDs, JD-derived claims,
unsupported technology/metrics/ownership, manual invalidation, imports and export.
Integration: empty private setup, durable restart, truthful end-to-end generation,
public/private UX, provider unavailable states, qualification versus priority.
Use mocked Gemini/ATS and synthetic fixtures by default.

## Migration Notes
Phase 0 fixes only harness-induced issues. Record baseline failures without
claiming product phases complete. Release:check must fail on unresolved product
failures or strict privacy findings. Live OAuth/DB/Blob, startup, preview, Studio
and production acceptance require checks beyond build and static scanning.

Final Phase 0: harness/evidence/privacy positive and negative fixtures pass; strict
privacy scan zero rule findings; five TOMLs parse. Bundled skill quick_validate
is unavailable because PyYAML is absent in both Python runtimes; repository
validator checks all eight skill metadata and links. Windows Git may warn about
LF/CRLF conversion. release:check fails on the inherited persistence test.
