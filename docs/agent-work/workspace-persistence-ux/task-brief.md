# Workspace persistence UX implementation brief

## Goal

Make Candidate Setup and Evidence Bank truthfully reflect durable persistence
while preserving the complete PR #3 evidence-review security model.

## Ownership and allowed paths

Sol owns architecture, contracts, security decisions, acceptance and integration.
The builder may change only:

- `src/App.tsx`
- `src/components/CandidateSetupView.tsx`
- `src/components/EvidenceBankView.tsx`
- `src/context/AppContext.tsx`
- `tests/workspace-ux.test.ts`
- active execution-plan result/checkpoint text

Do not change this security baseline without returning to Sol:

- `src/services/storage.ts`
- `src/services/api.ts`
- `src/utils/evidenceReview.ts`
- `server/workspaceRepository.ts`
- `server/workspaceRoutes.ts`
- `server/assessment.ts`
- `tests/evidence-review.test.ts`

## Required behavior

Candidate Setup has exactly one candidate profile and no ghost or duplicate
identity presentation. A clean draft follows the adopted profile; a dirty draft
is never silently overwritten. States are `Saved privately` when clean,
`Unsaved changes` when dirty, `Saving…` during explicit durable save,
`Saved privately` only after durable success, and
`Not saved — reload required` after failure.

Evidence creation uses a synchronous double-submit guard and shows `Saving…`
while the durable write is pending. Do not close or reset the modal before
acknowledgement. Success publishes exactly one card, with new manual evidence
still `Needs review`. Failure publishes no phantom card and retains the form when
authentication remains valid; existing fail-closed access-loss behavior wins.

Approval retains the current persisted ID + revision + SHA-256 content-hash
server protocol. Never create `Verified` client-side. Use a synchronous duplicate-
approval guard and close the dialog only after adopted server success.

Give the main UI and `QuickDataGrabModal` distinct namespaced React mode/epoch
keys.

Use only the existing `storageService` → `privateSnapshot` → `persistCurrent`
queue → revisioned API save path. Add no second queue, save endpoint, or component
fetch. Do not recover automatically from ambiguous durable failures. Rejected or
private-readiness state remains fail-closed until canonical reload.

## Acceptance

- Add focused workspace UX tests.
- Keep the evidence-review security suite untouched and passing.
- Pass typecheck, build, harness, privacy scan, runtime check, full `npm test`,
  `release:check`, and `git diff --check`.
- If available, a synthetic/local browser smoke shows no duplicate React-key
  warning.

Return changed paths, commands with exit results, remaining risks, and the exact
blocker if blocked. Do not commit, push, deploy, or touch production.
