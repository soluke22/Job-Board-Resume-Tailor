# Development workflow
## Branches and authority
GitHub is canonical. main is the stable integration branch; dev integrates all
productionization phases. Optional feature branches are for isolated/risky work
and converge into dev. Inspect status before switching; never discard local work.
A request to implement does not authorize pushing, merging or deploying.

## Release sequence
Complete phases on dev → full security/privacy/release audit → PR dev to main
→ merge → Google AI Studio pulls canonical main → compatibility verification
→ fixes reviewed through GitHub → main stable → Vercel production deployment.
Do not create the main PR or deploy production during Phase 0.
Earlier Vercel previews may help later validation without becoming production.

## Google AI Studio verification and responsibility
Verify app load, retained UI, Gemini workflows, healthy GitHub synchronization,
coherent public/private UX, and that stale Studio state cannot restore removed
architecture. Any Studio changes must return through GitHub and receive review.
Studio primarily handles UI/components, workflow UX, prompts/structured outputs,
resume/search UX and dashboard presentation. Codex/GitHub primarily owns auth,
authorization, schema/migrations, security boundaries, ATS canonicalization,
provenance enforcement, tests and Vercel runtime. This is a default division,
not an absolute ban; GitHub remains authoritative in either client.

## Transactional phases and usage interruption
Begin with AGENTS → active plan → relevant skill. Record intended phase and
acceptance criteria before implementing. Reuse settled docs and narrow findings.
At internal milestones update the plan; at coherent tested milestones commit
only owned changes. Record validation outcomes, blockers, baseline revision and
next exact action. Do not rely on conversation history or start another
subsystem when a safe checkpoint is more useful.
On resume inspect status and HEAD, reconcile them with the plan and rerun only
checks invalidated by intervening changes. Uncommitted work is pending work,
not a completed phase. Resolve failed checks or document pre-existing blockers.
The plan records its predecessor commit; locate its own checkpoint with
git log -1 -- docs/exec-plans/active/productionization.md (avoids self-hash loops).
Move the plan to completed only after all project phases are complete.
