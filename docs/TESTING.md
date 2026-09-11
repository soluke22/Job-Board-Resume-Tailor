# Testing
## Existing commands
Run from repository root with Node/npm and Bun available:
- Install locked dependencies: `bun install --frozen-lockfile`.
- Baseline tooling note: installed Bun 1.3.13 cannot read the checked-in lockfile version 2. Phase 1 validation used `npm install --ignore-scripts --package-lock=false`; this fallback does not reproduce the Bun lock exactly. Resolve package-manager compatibility before productionization.
- Development: `npm run dev`.
- Build: `npm run build` (Vite client plus esbuild server).
- Type check: `npm run lint` (TypeScript; no separate ESLint configuration).
- Automated tests: no test script, test runner or test files exist at the Phase 1 baseline. `npm test` is not a valid validation command yet.
- Production smoke: set NODE_ENV=production in the shell, then `npm start`; verify /api/health and UI serving. Build success does not establish startup success.

## Required future coverage
These are acceptance specifications, not existing passing tests. Add executable suites and exact commands with the implementation that introduces them.
Security: missing/forged/expired/revoked sessions denied; an email alone cannot log in; non-owner OAuth identity denied; state/callback validation; cross-owner record/file access denied; database/auth/storage outage fails closed; logout prevents further access; private content absent from demo and public bundles; URL fetches reject private network targets and unsafe redirects.
Integration: use synthetic fixtures and mocked Gemini/ATS responses to exercise exact posting verification, board-only responses, closed roles, malformed URLs, provider errors, deduplication within/across batches, unknown/invalid dates and deterministic blockers. Never call paid/live providers by default in tests.
Evidence: reject unapproved/disabled/rejected/cross-owner IDs, JD-derived accomplishments, unsupported metrics and ownership inflation; manual edits invalidate approval; imports cannot self-verify.
Acceptance: isolated empty private setup, truthful discovery-to-tailoring flow, stable identity, retained provenance through save/reload/export, unavailable provider state, durable authorized data after restart, separate fit and priority.

## Release procedure
Run build, type check and relevant implemented suites; identify missing security/integration coverage explicitly.
Review `git diff --check`, `git diff --stat` and the scoped diff, including new untracked files. Inspect git status so user changes are not mistaken for harness work.
Private-data scan: inspect tracked source and generated public assets for actual identity/contact strings, career details and credentials. A practical initial locator is `rg -l -i 'solomon|lucas.?thornton|disney|espn|@gmail|api[_-]?key|secret|token' src server server.ts .env.example`; manually classify hits and inspect dist after a successful build. This is triage, not a complete privacy/security test. Do not paste matched private values into public reports.
Report command outcomes, missing coverage, scan findings and remaining release blockers separately. A harness navigation pass does not certify product safety.
