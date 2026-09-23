# Codex operating harness

Reconciliation update (2026-09-12): descriptions of pending/uncommitted work and
5/6 test results below are historical Phase 0 snapshots. All inherited product
work is preserved in 41a04f8; stale test fixtures corrected in 0828816. Final
suite passes 6/6. Use npm ci with package-lock.json. See
[reconciliation record](DEV_RECONCILIATION.md) and active execution plan for
current state; preserved integrations still require production acceptance.
## Audit
Historical pre-change 2026-09-12 inventory found root router, seven domain docs, seven manually routed
skills and three generic agent TOMLs; no nested AGENTS/overrides, active plans,
discoverable repo skills or validation scripts outside dependencies/build.
Consolidated useful skills into .agents/skills; split ATS and ranking.
Replaced inherited-model generic roles with four focused read-only specialists.
Old Phase 1 harness terminology is superseded by current plan Phase 0.
Pending product work preserved, excluded from harness checkpoint.

## Model policy
Productionization parent GPT-5.6 Sol Medium owns writes, stays fixed per phase.
High for demonstrated subtle auth, difficult migration/integration problems or
final architecture review. No Fast unless requested. No XHigh/Max/Ultra merely
for importance. Astra only after a coherent Sol attempt fails on a concrete
complex/cross-system problem; requested Astra Light maps to supported low
effort and must be disclosed. Never default Astra or stronger escalation.
| Specialist | Model | Effort |
| --- | --- | --- |
| builder | gpt-5.6-terra | medium |
| code-mapper | gpt-5.6-terra | medium |
| docs-researcher | gpt-5.6-luna | medium |
| test-triager | gpt-5.6-terra | medium |
| security-reviewer | gpt-5.6-sol | high |
The builder is the one bounded write-capable implementation worker. Sol owns
architecture, contracts, scope, security decisions, acceptance and integration;
the builder owns only assigned discovery, edits, tests, debugging and routine UI
QA. Code-mapper, docs-researcher, test-triager and security-reviewer remain
read-only. Use one writer by default, never delegate recursively, and do not
invoke specialists ritualistically. Do not poll a healthy builder. Review its
actual diff instead of trusting its report; default to one consolidated correction
cycle. Mapper only when ownership is unclear; reviewer only after a meaningful
diff; reuse findings and durable documentation.

## Supported configuration
npm CLI 0.111.0 differs from desktop binary 0.153.4. Installed CLI static
inspection plus [official custom-agent docs](https://learn.chatgpt.com/docs/agent-configuration/subagents)
supports .codex/agents/*.toml: name, description, developer_instructions, model,
model_reasoning_effort and sandbox_mode. Project config sets Sol Medium and
legacy agents.max_threads=2 conservatively. Installed CLI counting semantics
are unverified locally; policy remains parent plus one builder or narrow read-only
helpers, with one writer. Newer docs use max_concurrent_threads_per_session=2
excluding parent; retain legacy compatibility.
No unsupported default_subagent_* keys. Current host exposes requested IDs;
other account/host availability is conditional. Trust/security policy may ignore
repo configuration; restart if discovery stale. Files do not switch live parent.
Syntax/static support checked; no paid live model probe. State rejected override
rather than silently substitute. Browsing/MCP requires available capability.
[Official skill discovery](https://learn.chatgpt.com/docs/build-skills) uses .agents/skills.

## Routing simulation
| Request | Skill | Specialist if useful | Parent | Validation |
| --- | --- | --- | --- | --- |
| Google OAuth owner auth | workspace-security | Mapper if unclear; security-reviewer after diff | Sol Medium | Type/build, auth denial tests, configured OAuth smoke |
| Removed Greenhouse role shows LISTED | ats-verification | Terra mapper if unclear | Sol Medium | Type/build, exact/removed/board/error fixtures; ATS suite needed |
| Unsupported technology after resume edit | evidence-provenance | None normally | Sol Medium | ID integrity plus semantic/manual edit/save/export rejection |
| Neon migration fails in preview | vercel-deployment | Luna docs; Terra failure triager | Sol Medium; High only if sensitive | Migration tests, build, authorized preview smoke |
| Dashboard card | None; repo-context only if unclear | Mapper only if needed | Terra Medium or AI Studio for isolated UI | Type/build/UI smoke |
| Final security review | release-validation | Sol High security-reviewer | Sol High review | Release composition and manual security gates |
Rows load only applicable domain knowledge; TESTING distinguishes missing suites.

For substantial implementation, Sol may hand one complete contract to `builder`.
The builder makes routine in-scope decisions and runs the complete code/fix/test
loop without committing or touching remote or production state. Sol inspects the
diff, resolves architecture/security/acceptance questions, and integrates only
after the requested evidence passes.

## Maintenance and resilience
AGENTS routes/global invariants; skills procedures; docs durable knowledge;
TOMLs specialist behavior; plan current state; scripts enforceable checks.
Five-hour interruptions recover from scoped checkpoint, recorded validations
and next exact action in active plan. Do not depend on conversation or resets.
Baseline type/build pass, tests 5/6 with workspace validation failure.
Bounded scanner/ID integrity cannot certify private-data absence or claim support.
