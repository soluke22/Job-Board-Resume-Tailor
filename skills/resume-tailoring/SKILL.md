---
name: resume-tailoring
description: Construct truthful role-specific resumes after job screening using approved evidence.
---

# resume-tailoring

## Load
Read [EVIDENCE_MODEL.md](../../docs/EVIDENCE_MODEL.md), the application's screened job analysis and selected approved evidence.

## Workflow and completion
Work through server.ts generate-plan/generate-resume/regenerate-bullet routes and ResumeEditorView/ResumePaper as applicable. Optimize recruiter-visible evidence, not keyword stuffing. Preserve deterministic identity metadata; do not invent metrics or inflate ownership. Keep evidence IDs on generated claims and validate them before final output. Missing screening or evidence is a prerequisite gap, not permission to generate a fallback. Completion includes truthful role-specific emphasis and provenance retained through rendering/export.

## Validation
Run npm run lint, npm run build and relevant tailoring/provenance scenarios in [TESTING.md](../../docs/TESTING.md).
