# Dev reconciliation — 2026-09-12
## Verified history
After git fetch origin: origin/dev=1a620d67a97142d468f3cace5ed90a308aa5a811;
local dev=b12fd5b5fa4bc42d1889633d77237e5a8c31411c.
main and origin/main=18bde7f451e4e5f39e303f82a0507a30233cd35e.
History is main → old harness 1a620d6 → authoritative Phase 0 b12fd5b.
No remote-only commit exists. Normal fast-forward push preserves both commits;
no merge/rebase/cherry-pick/force-push is needed.

## Older remote work classification
Useful durable domain knowledge and router intent are already present, refined
by Phase 0. The older remote commit has no application changes.
Obsolete generic agent TOMLs and manual skills/ paths were intentionally replaced
in b12fd5b by four model-configured read-only roles and eight .agents/skills.
Their history remains reachable; do not reintroduce stale operating structure.
No remote change requires clean reapplication; none was lost.

## Inherited local file disposition
Each path was classified before staging. All 46 are legitimate inherited product
or required reproducibility/schema work. None is discarded. Generated npm lock
and Drizzle metadata are intentional source artifacts, not local-only cache.
The partial workspace fixtures are stale; preserve original in the application
checkpoint, then correct only the test in a separate commit.
This checkpoint preserves work overlapping Phases 1/2/8; it does not complete
those phases or certify live authentication, storage, migration or hosting.
No new authentication implementation is performed by reconciliation.

| Path | Classification / disposition | Reason |
| --- | --- | --- |
| .env.example | Legitimate product work; preserve | Server-only configuration placeholders for inherited integrations. |
| .gitignore | Legitimate product work; preserve | Private documents, exports, credentials and local deployment/tool directories ignored. |
| package.json | Legitimate product work; preserve | Dependencies, test/db commands and ESM/local runtime wiring; Phase 0 scripts retained. |
| server.ts | Legitimate product work; preserve | Inherited auth/route wiring, private API guards, identifier redaction and removal of private defaults; discovery/provenance still need audit. |
| src/App.tsx | Legitimate product work; preserve | Inherited session loading/save status and remount across workspace transitions. |
| src/components/AddJobModal.tsx | Legitimate product work; preserve | Generic candidate/evidence wording replaces private career claims. |
| src/components/AtsGuardsModal.tsx | Legitimate product work; preserve | Removes unsupported certification claims; presents checks as review guidance. |
| src/components/AuthModal.tsx | Legitimate product work; preserve | Inherited Google sign-in UI replaces email-only token UI. |
| src/components/CandidateSetupView.tsx | Legitimate product work; preserve | Inherited empty setup, selective JSON import and private file UI; removed heuristic claims remain in history. |
| src/components/DashboardView.tsx | Legitimate product work; preserve | Candidate/project-derived display replaces hardcoded private career labels. |
| src/components/EvidenceBankView.tsx | Legitimate product work; preserve | Blank employer for new records replaces private employer default. |
| src/components/ExportModal.tsx | Legitimate product work; preserve | Generic resume download filenames replace candidate-specific names. |
| src/components/JobAnalysisView.tsx | Legitimate product work; preserve | Generic evidence-based guidance replaces private career assertions. |
| src/components/MasterResumeView.tsx | Legitimate product work; preserve | Use supplied resume/profile records for employment/identity labels. |
| src/components/Navigation.tsx | Legitimate product work; preserve | Generic Candidate fallback replaces private identity. |
| src/components/ProjectsView.tsx | Legitimate product work; preserve | Generic candidate/evidence wording replaces private career claims. |
| src/components/QuickDataGrabModal.tsx | Legitimate product work; preserve | Use supplied resume/profile records for employment/identity labels. |
| src/components/ResumeEditorView.tsx | Legitimate product work; preserve | Use supplied resume/profile records for employment/identity labels. |
| src/components/SkillsView.tsx | Legitimate product work; preserve | Generic candidate/evidence wording replaces private career claims. |
| src/context/AppContext.tsx | Legitimate product work; preserve | Inherited session restoration, save queue/revisions and private cache lifecycle. |
| src/data/privateSeedTemplate.ts | Legitimate product work; preserve | Empty private form shapes replace candidate identity/history/preferences. |
| src/services/api.ts | Legitimate product work; preserve | Inherited same-origin session/workspace calls and cancellation/access-loss handling. |
| src/services/storage.ts | Legitimate product work; preserve | Private in-memory cache separated from synthetic demo browser persistence. |
| src/types/index.ts | Legitimate product work; preserve | requires-review state aligns imported records with persistence schema. |
| api/index.ts | Legitimate product work; preserve | Inherited local/preview runtime adapter; no production deployment. |
| drizzle.config.ts | Legitimate product work; preserve | Migration schema/output configuration, server-only database URL. |
| migrations/0000_friendly_matthew_murdock.sql | Legitimate product work; preserve | Auth/workspace and queryable-domain schema migrations; no remote migration executed. |
| migrations/0001_cynical_khan.sql | Legitimate product work; preserve | Auth/workspace and queryable-domain schema migrations; no remote migration executed. |
| migrations/meta/0000_snapshot.json | Generated, required source artifact; preserve | Generated Drizzle migration journal/snapshot; required schema lineage, not local cache. |
| migrations/meta/0001_snapshot.json | Generated, required source artifact; preserve | Generated Drizzle migration journal/snapshot; required schema lineage, not local cache. |
| migrations/meta/_journal.json | Generated, required source artifact; preserve | Generated Drizzle migration journal/snapshot; required schema lineage, not local cache. |
| package-lock.json | Generated, required source artifact; preserve | Generated npm dependency lock, legitimate reproducibility artifact; selected for npm ci. |
| server/auth.ts | Legitimate product work; preserve | Inherited Better Auth verified-owner/session implementation; preserve, not certify Phase 1. |
| server/db/client.ts | Legitimate product work; preserve | Inherited lazy Neon/Drizzle database client. |
| server/db/schema.ts | Legitimate product work; preserve | Inherited owner-scoped domain/auth/file schema. |
| server/db/workspaceValidation.ts | Legitimate product work; preserve | Inherited strict persisted-contract runtime schemas; keep validation boundary. |
| server/local.ts | Legitimate product work; preserve | Inherited local/preview runtime adapter; no production deployment. |
| server/privacy.ts | Legitimate product work; preserve | Inherited outbound identifier redaction helper; not a complete privacy guarantee. |
| server/privateFiles.ts | Legitimate product work; preserve | Inherited owner-scoped private Blob upload/download/delete. |
| server/workspaceRepository.ts | Legitimate product work; preserve | Inherited transactions, owner queries, revisions and review-marked import. |
| server/workspaceRoutes.ts | Legitimate product work; preserve | Inherited protected data/import/export/audit route adapter. |
| src/components/PrivateFilesView.tsx | Legitimate product work; preserve | Inherited private file list/upload/download/delete UI. |
| src/services/legacyImport.ts | Legitimate product work; preserve | Selective legacy import preview; originals retained and imports require review. |
| tests/auth-security.test.ts | Legitimate product work; preserve | Synthetic owner/session/file denial and revocation tests; preserve. |
| tests/workspace.test.ts | Legitimate test; stale fixture, preserve then fix | Useful persistence/ownership/concurrency/import test with stale partial fixtures; checkpoint original then correct separately. |
| vercel.json | Legitimate product work; preserve | Inherited local/preview runtime adapter; no production deployment. |

## Remaining audit gates
Live Google OAuth, Neon and Blob, client save/cache lifecycle, public/private UX,
SSRF, AI semantic provenance, ATS truthfulness and deployment acceptance remain
future phase work. Static/type/synthetic checks do not replace these.
The committed bun.lock describes older dependencies; retain it as historical
user work, use package-lock.json/npm ci for this checkpoint. Remove or regenerate
the obsolete Bun lock only during an explicitly chosen package-manager cleanup.


## Test disposition and checkpoints
41a04f8 preserves all inherited files including original failing fixture.
0828816 fixes only workspace.test.ts: complete synthetic records for save/import/
history/search; malformed and partial records remain rejected. Initial line 26
failed at repository safeParse before DB work, not a failing persistence assertion.
Failure predates Phase 0 edits (recorded/reproduced on inherited tree).
No application behavior changed during reconciliation. Final deterministic checks
pass; live service and phase acceptance remain unverified. Publication checkpoint
adds this record, active state and updated install routing, then fast-forwards
origin/dev. Older remote work and b12fd5b remain ancestors of final HEAD.
