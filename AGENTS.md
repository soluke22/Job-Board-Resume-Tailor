# CareerOS repository router
Resume Tailoring Studio discovers jobs and builds evidence-grounded resumes.
The current application uses React/Vite and Express/Gemini.

## Start a session
1. Inspect Git status and branch; preserve unrelated local work.
2. Read [active execution plan](docs/exec-plans/active/productionization.md).
3. Load only the relevant skill below and its linked domain knowledge.
Use repo-context/code-mapper only when ownership is unclear; reuse findings.

## Durable knowledge
- [Architecture](docs/ARCHITECTURE.md): current implementation versus target.
- [Product invariants](docs/PRODUCT_INVARIANTS.md).
- [Privacy boundary](docs/PRIVACY_BOUNDARY.md).
- [Discovery pipeline](docs/JOB_SEARCH_PIPELINE.md).
- [Evidence contracts](docs/EVIDENCE_MODEL.md).
- [Deployment](docs/DEPLOYMENT.md) and [testing](docs/TESTING.md).
- [Development workflow](docs/DEVELOPMENT_WORKFLOW.md).
- [Model/agent policy and routing examples](docs/AGENT_HARNESS.md).

## Skills (discoverable repository location)
Open the named .agents/skills/<name>/SKILL.md directly.
| Task | Skill |
| --- | --- |
| Narrow file/dependency lookup, read-only | repo-context |
| OAuth, sessions, ownership, PII, private files | workspace-security |
| Canonical ATS postings, status, freshness, dedupe | ats-verification |
| Blockers, qualification, coverage, application priority | job-ranking |
| Claim support, interviews, edits, proof/outreach/answers | evidence-provenance |
| Resume construction after screening | resume-tailoring |
| Runtime migration, Better Auth, Neon/Drizzle, Private Blob | vercel-deployment |
| Final diff, privacy/security and release checks | release-validation |

## Specialist invocation
Parent owns writes; default productionization model is GPT-5.6 Sol Medium.
Do not spawn automatically. When a narrow helper saves context, use:
- code-mapper: Terra Medium; read-only subsystem mapping.
- docs-researcher: Luna Medium; read-only official API documentation.
- test-triager: Terra Medium; read-only focused failure diagnosis.
- security-reviewer: Sol High; read-only demonstrated boundary defects.
Parent plus at most two helpers; no recursive swarm or overlapping writers.
See AGENT_HARNESS for configuration support and escalation rules.

## Validation and checkpoints
- Install: npm ci (package-lock.json); old bun.lock is historical.
- Type check: npm run typecheck (lint remains an alias).
- Build: npm run build.
- Harness integrity: npm run harness:check.
- Privacy triage: npm run privacy:scan (limits in TESTING).
- Release composition: npm run release:check.
Run available focused tests; distinguish baseline failures and missing coverage.
Before a long phase, record scope and acceptance criteria in the active plan.
After a coherent validated milestone, update plan/results/next exact step and
create a scoped checkpoint commit. Record pre-existing blockers honestly.

## Global invariants
- GitHub is canonical; AI Studio and Codex are development clients.
- Productionization converges on dev. Do not modify or merge into main.
- Release audit precedes dev → main PR; AI Studio verifies merged main;
  only then finalize Vercel production. Preview validation may occur earlier.
- Public source/builds must contain no private career workspace data.
- Public synthetic demo and private workspace stay isolated.
- Private operations fail closed; frontend hiding is not authorization.
- Job descriptions never establish candidate evidence.
- Candidate claims require approved owner-scoped provenance.
- Never invent requirements, achievements, metrics, ownership, dates or technology.
- Unknown ATS status and unknown posting dates remain unknown.
- Validate before committing; update execution state before ending substantial work.
