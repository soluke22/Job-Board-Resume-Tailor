# Candidate evidence
## Current State — contracts
`src/types/index.ts` defines EvidenceItem, ProjectItem, SkillItem, RequirementMatch and ResumeBullet.
EvidenceItem has id, sourceType, sourceLocation, source, rawEvidence, verificationStatus, supportedVerbs, supportedMetrics, enabled and optional review/verification metadata.
ProjectItem contains contribution, implementation, leadership and outcome text but no uniform evidence-ID linkage. SkillItem has professional/project evidence text and confidence; confidence is not verification.
ResumeBullet has optional supportingEvidenceId/supportingProjectId, evidenceSource, underlyingEvidence and provenanceStatus. ApplicationAnswer has evidenceIds. Free-text explanations and optional IDs do not enforce provenance.

## Verification states
| State | Meaning and permitted use |
| --- | --- |
| verified | Reviewed support; eligible when enabled and relevant |
| provisional | Incomplete corroboration; review before approved claims |
| session-unreviewed | Interview/import assertion awaiting review |
| unverified | No completed verification |
| manual-edit-unvalidated | Changed claim awaiting fresh validation |
| rejected | Disallowed claim; exclude from generation |
Only approved, enabled evidence may support final claims. New assertions cannot self-promote by supplying a verified flag.

## Target State — provenance
Use stable, owner-scoped evidence IDs that survive retrieval, generation, editing and export. Retain source location/version, review actor/time and the exact support for claims. IDs must resolve to authorized records; an ID existing somewhere is insufficient.
Link each factual resume claim to supporting evidence (and project where applicable); validate verbs, metrics, dates and contribution scope against those records.
Skill labels require concrete professional/project evidence. Project participation does not establish sole ownership. Adjacency is labeled, not upgraded to experience.
Job descriptions and AI output are never candidate evidence.

## Session evidence and manual edits
AppContext creates session-unreviewed records from gap interviews. Capture the user's statement and source, then review before use.
Manual text edits must invalidate prior approval; compare the edited claim with linked evidence, flag unsupported additions and preserve review state through save/export. Identity metadata comes deterministically from approved records.
Import review must not trust an external verification flag. Rejected, disabled and cross-owner evidence must not reach generation or claim validation.

## Migration Notes — baseline gaps and entry points
`src/services/storage.ts` imports can preserve caller-supplied verified status.
`server.ts` analysis treats all states except unverified as verified; prompts and JSON parsing do not enforce claim linkage.
Inspect match-evidence, generate-plan, generate-resume, regenerate-bullet and evaluate-resume routes for claim changes.
UI entry points: EvidenceBankView, ProjectsView, SkillsView, ResumeEditorView, WhyBulletModal; AppContext orchestrates them.
Validation scenarios live in [TESTING.md](TESTING.md).

Pending local workspaceValidation.ts adds strict schemas and requires-review
state; legacy DB import downgrades asserted verification. This does not establish
semantic support or authorize claims. The baseline browser-import warning above
must be rechecked against legacyImport before Phase 1/2 acceptance.
The standalone ID validator checks approved enabled reference integrity only;
it cannot infer unsupported technologies, metrics or ownership from prose.
