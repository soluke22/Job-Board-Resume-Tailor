---
name: resume-tailoring
description: Build the strongest truthful role-specific resume after screening using approved evidence.
---
# resume-tailoring
## Load
Read docs/EVIDENCE_MODEL.md, current screened job analysis and approved evidence from repository root; resolve docs links relative to root, not this directory.
## Relevant modules
server.ts plan/resume/regenerate routes, ResumeEditorView, ResumePaper (confirm existence in the active checkout).
## Procedure and invariants
Confirm screening prerequisites, retrieve evidence, emphasize interview-relevant support and preserve deterministic identity/provenance through edits and exports. Do not optimize keyword density or invent contribution scope.
## Validation
npm run typecheck; npm run build; synthetic provenance validator and tailoring/export scenarios in TESTING.
## Completion
Screened job, supported claims and retained provenance through render/save/export.
