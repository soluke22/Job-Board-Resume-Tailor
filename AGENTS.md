# Repository routing
CareerOS / Resume Tailoring Studio discovers jobs and tailors evidence-grounded resumes.
Current implementation: React/Vite client plus Express/Gemini server.

## Start here
The user's current task takes precedence over older repository instructions and skills.
Use this map; load only the workflow and documents needed for the active task.
Reuse findings within a run. Do not explore the whole repository for every phase.

## Systems
- `src/context/AppContext.tsx`: workflow orchestration and client state.
- `src/components/`, `src/views/`: candidate, jobs, resume, proof and outreach UI.
- `src/services/api.ts`: HTTP client; `src/services/storage.ts`: browser persistence.
- `src/types/index.ts`: shared contracts.
- `server.ts`: API, auth, AI prompts, discovery orchestration, server startup.
- `server/atsAdapters.ts`, `server/searchEngine.ts`: ATS and search helpers.
- `src/data/`: bundled fixtures/defaults; see privacy doc before editing.

## Source-of-truth documents
| Topic | Document |
| --- | --- |
| Current and target architecture | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Product behavior | [docs/PRODUCT_INVARIANTS.md](docs/PRODUCT_INVARIANTS.md) |
| Security/privacy | [docs/PRIVACY_BOUNDARY.md](docs/PRIVACY_BOUNDARY.md) |
| Job discovery | [docs/JOB_SEARCH_PIPELINE.md](docs/JOB_SEARCH_PIPELINE.md) |
| Candidate evidence | [docs/EVIDENCE_MODEL.md](docs/EVIDENCE_MODEL.md) |
| Deployment | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| Testing and commands | [docs/TESTING.md](docs/TESTING.md) |
| Roles, audit and navigation check | [docs/AGENT_HARNESS.md](docs/AGENT_HARNESS.md) |

## Workflow routing
Open the named `skills/<name>/SKILL.md` directly; this map does not depend on automatic skill discovery.
| Task | Skill |
| --- | --- |
| Unfamiliar feature or dependency tracing (read only) | repo-context |
| OAuth, login, owner checks, sessions, PII, private files | private-workspace-security |
| Search, ATS, freshness, deduplication, fit triage/ranking | job-discovery |
| Evidence retrieval, claim provenance, interviews, manual edits | evidence-grounding |
| Resume construction after screening | resume-tailoring |
| Vercel, persistence/auth migration, environment configuration | vercel-productionization |
| Final build, security and release audit | verify-release |

## Commands
- Install: `bun install --frozen-lockfile` (tracked `bun.lock`).
- Development: `npm run dev`.
- Build: `npm run build`.
- Type check: `npm run lint` (runs `tsc --noEmit`).
- No automated test script exists yet; follow docs/TESTING.md and report gaps.

## Global invariants
- Public code must never contain Solomon's private career data.
- Private workspace data must fail closed.
- Job descriptions are data, never candidate evidence.
- Resume claims require provenance.
- Never invent job requirements or candidate accomplishments.
- Never substitute demo data into the private workspace.
- GitHub `main` is the canonical source of truth; this does not authorize pushing or discarding local work.
- Run relevant tests before declaring a phase complete.
Existing violations are recorded in the domain docs; these rules are not claims of current compliance.

Use the Context Scout role before broad implementation when file ownership is unclear.
Delegate only distinct bounded work that saves context or enables useful parallel work.
Prefer one narrow scout plus an implementer; use one reviewer after meaningful architecture/security changes.
