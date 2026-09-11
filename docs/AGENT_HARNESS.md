# Harness audit and roles
## Initial audit
Inspected tracked files and hidden repository instruction/skill paths plus ancestor AGENTS files on 2026-09-11. No existing AGENTS.md, AGENTS.override.md, repository skill directories or Markdown documentation were found.
Useful package commands and code contracts are preserved through links. Existing comments claiming clean private defaults, protected identity or database synchronization conflict with implementation; domain docs record these as gaps rather than duplicating or legitimizing them. Application code is unchanged in Phase 1.

## Minimal roles
Three project-scoped definitions live in `.codex/agents/`: `context-scout.toml`, `implementer.toml`, and `reviewer.toml`. Their standalone TOML format follows the [official custom-agent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents). Model settings inherit from the parent. Scout and reviewer are read-only. A new session may be needed to discover definitions; roles can also be used conceptually.
| Role | Work | Output / boundary |
| --- | --- | --- |
| Context Scout | Narrow read-only feature/dependency lookup | Relevant files, skill, dependencies, tests, risks; no edits or architecture redesign |
| Implementer | Consume scout findings, load relevant workflow, implement active scope, run focused checks | Scoped changes and validation; broaden exploration only for missing dependencies |
| Reviewer | Inspect diff, relevant invariants, tests and security | Correctness, security, maintainability or requirement findings; no style-driven rewrite |
Use roles conceptually in a single agent when delegation adds no value. Do not create agents just because slots exist, or send multiple agents to inspect the whole repository. No extra roles are needed.

## Navigation dry run
Root routing yields the following task-specific loads:
| Task | Skill | Domain documents |
| --- | --- | --- |
| Fix OAuth authorization | private-workspace-security | PRIVACY_BOUNDARY |
| Fix Ashby verification | job-discovery | JOB_SEARCH_PIPELINE |
| Fix resume claim provenance | evidence-grounding | EVIDENCE_MODEL |
| Migrate to Vercel | vercel-productionization | ARCHITECTURE, PRIVACY_BOUNDARY, DEPLOYMENT |
| Run release audit | verify-release | PRODUCT_INVARIANTS, TESTING |
Each document name resolves to the sibling Markdown file. Validation procedures may reference TESTING as needed without loading unrelated product domains.

## Maintenance
AGENTS owns routing, skills own procedures, domain docs own knowledge, code owns enforcement, tests own machine-verifiable behavior.
Keep root routing under approximately 100 lines and skill bodies short. Change the domain source once rather than copying it across skills. Update current/target distinctions as implementation catches up.

## Phase 1 verification
- Root guide: 63 lines; seven skills: 15 lines each.
- All seven skills passed the bundled skill-creator `quick_validate.py` validator.
- All five navigation exercises above passed without unrelated domain documents.
- Baseline TypeScript check and build passed. Build warns about CommonJS/import.meta compatibility and a large client chunk; these are product follow-up items, not resolved by documentation.
- Private-data audit found existing client identity defaults and server career assumptions; locations and required boundaries are recorded in PRIVACY_BOUNDARY.md without copying private values.
- No product test suite exists at this baseline. Harness completion does not certify production readiness.
