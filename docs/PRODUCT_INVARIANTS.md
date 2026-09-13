# Product invariants
## Current State
Current code does not enforce all requirements; see domain gaps and active plan.

## Target State

- Evidence over keywords: rank and tailor using substantiated work, not token overlap.
- Qualification fit is distinct from application priority. Priority may incorporate timing and preferences; it must not inflate qualifications.
- Adjacent skill or project exposure is not direct professional experience.
- Public demo and private candidate are distinct datasets and identities.
- Missing providers, records or evidence produce explicit unavailable/empty states; no fake fallbacks.
- Fit scores require an explainable assessment against actual requirements and evidence; no role-family constants posing as assessment.
- Unknown publication dates remain unknown. Observation and verification times are not publication dates.
- Responsibilities, requirements, location, compensation and seniority must come from sources; missing facts remain missing.
- Candidate claims must be supported by approved provenance; unsupported metrics and ownership verbs cannot be generated or silently accepted through edits.
- Identity, employers, roles and dates must come from approved candidate records, not model invention.
- Screening precedes tailoring. A tailored presentation cannot erase a hard blocker.
- Failure and uncertainty must remain visible through ranking, export and downstream application artifacts.

Implementation-specific gaps and acceptance scenarios live in the domain docs and [TESTING.md](TESTING.md).

## Migration Notes
Phase 0 changes operating infrastructure only. Pending product changes are not
certified by the harness checkpoint; later phases update domain enforcement.
