# Job search pipeline
## Target State — intended stages
Discover -> Canonicalize -> Verify -> Deduplicate -> Deterministic blockers -> Fast fit -> Evidence retrieval -> Deep fit -> Rank -> Tailor

1. Discover: retain source URL, query and observed time; search results are unverified leads.
2. Canonicalize: normalize supported URLs and retain ATS provider, board and posting ID; preserve meaningful identity parameters.
3. Verify: resolve the exact posting using authoritative ATS content; retain status, source and verification time.
4. Deduplicate: prefer provider/board/posting ID, then canonical URL; title/company alone must not merge distinct openings. Update the seen set within the batch.
5. Deterministic blockers: evaluate supported mandatory requirements against explicit candidate constraints; distinguish missing information from a blocker.
6. Fast fit: cheap explainable triage from verified facts; do not invent a score when inputs are missing.
7. Evidence retrieval: select approved relevant owner evidence with IDs.
8. Deep fit: assess requirements, direct/adjacent support and gaps separately.
9. Rank: combine qualification, coverage and application preferences without conflating them.
10. Tailor: pass screened analysis and selected evidence to resume generation.

## Current State — modules and gaps
`server.ts` orchestrates Gemini search and constructs JobRecord objects. `server/searchEngine.ts` provides blockers, freshness, description hashing and a bounded 24-hour process cache.
Current discovery deduplicates by company/title, starts verification as LISTED, defaults publication to now, assigns constant fit/coverage by family and generates fixed responsibilities. These violate the target; don't preserve them as specifications.
Discovery summaries are not authoritative full job descriptions. Blockers currently include candidate-specific assumptions; derive future rules from supported evidence/preferences.

## Role classification
Canonical PrimaryRoleFamily values in `src/types/index.ts`: frontend-product, ui-platform-design-systems, frontend-heavy-fullstack, production-support-frontend, forward-deployed-software.
Legacy RoleFamily aliases frontend-product-engineer and internal-tools-fullstack-frontend remain in prompts/contracts; normalize deliberately when migrating.
Modifiers describe domain/context, not qualification: AI_PRODUCT, MEDIA, SPORTS, ACCESSIBILITY, INTERNAL_TOOLS, DEVELOPER_TOOLING, DESIGN_SYSTEMS, PRODUCTION_SUPPORT, B2B_SAAS, CUSTOMER_FACING, DATA_VISUALIZATION, EARLY_STAGE, ENTERPRISE.

## Freshness
publishedAt is an authoritative publication timestamp; updatedAt is a source update; firstSeenAt is our observation; lastVerifiedAt is our check.
Never substitute one for another without an explicit label. Unknown publication stays unknown, not today.
Existing bands are NEW (0-7 days), RECENT (8-21), ESTABLISHED (22-45), OLD (over 45). The current type has no unknown band and the helper falls back to firstSeenAt/now; future handling must represent uncertainty explicitly, including invalid/future dates.

## ATS semantics
`server/atsAdapters.ts` implements Ashby public board API, Greenhouse job/board API, Lever postings API and generic page fetch.
Workday is detected but uses the generic adapter; no dedicated verification exists.
LISTED requires evidence for the exact active posting; NOT_LISTED means authoritative absence/closure; UNLISTED represents a known unlisted role; UNKNOWN is inconclusive; UNSUPPORTED means no supported verifier.
An active board does not verify an individual role. HTTP 200 does not prove an active job.
Current Ashby/Greenhouse board-level success and generic reachable-page success are too permissive. Provider detection uses substring checks; URL host validation, redirect handling and SSRF defenses need review.
Network/provider failures must preserve uncertainty, not promote a lead.

## Migration Notes
Inherited working-tree discovery still initializes LISTED, substitutes current
publication dates, uses role-family score constants and fixed responsibilities
(server.ts near discovery record assembly). These are demonstrated pending gaps,
not Phase 0 fixes. Add focused ATS/ranking suites with Phases 3/4.
