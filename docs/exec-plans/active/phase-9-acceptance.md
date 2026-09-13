# Phase 9 acceptance — security/privacy/release audit

Baseline: clean dev == freshly fetched origin/dev == b98a2a8.
Scope: actual security boundaries and main-to-dev release diff; parent owns fixes.
No Phase 10, main writes, PR, Studio, Vercel deployment or remote migrations.
Phase 8 deferred platform acceptance is not a Phase 9 defect.

Status: PARTIAL — deterministic code audit completed; historical contact provenance/disposition remains UNVERIFIED. Phase 10 readiness: NO. Phase 8 external gates are separate deferred acceptance, not defects.

## Threat model

Untrusted actors: internet callers, non-owner identities, stolen browser sessions, malicious ATS/JD text, imports/files and model output. Owner sessions authorize private operations but do not certify claims or history. Provider outages and concurrent requests can fail or race.

Protected assets: evidence/profile/contact data, resumes, applications, interviews/outreach, files, audit/history, OAuth sessions, provider credentials, Gemini spend and database contents.

Boundaries: browser to Express; Google to Better Auth; Express to Neon, private Blob, Gemini and public job URLs; import to persistence. Auth uses server-derived identity; repositories qualify owners; external/model data cannot establish evidence or readiness.

## Acceptance matrix

| Boundary | Current control | Attack / failure case | Evidence | Status | Remediation | Retest |
| --- | --- | --- | --- | --- | --- | --- |
| authentication | Google-only verified exact-owner hooks; disabled password/linking/identity changes; canonical origin/secret | Forged/missing configuration, identity, cookie/token | auth-security + Phase 1 real Better Auth memory adapter/session tests | PASS | Retained; no demonstrated bypass | Full suite |
| authorization / IDOR | Server-derived owner; composite keys and owner-qualified repository predicates | Synthetic A/B same IDs; foreign job/evidence/resume/artifact/file/history | Phase 2/4/5/6/7 repository/handler tests; query review | PASS | Retained | Full suite |
| sessions | DB session lookup; signed opaque cookies; no cookie cache | Missing/expired/forged/revoked/invalid expiry; validation DB failure | Phase 1 auth/client tests | PASS | Retained; provider-account mutation live proof remains external | Full suite |
| logout | Adapter revocation before library swallow; browser generation invalidation | Repeated logout, deletion outage, stale in-flight responses | Phase 1 auth/client tests | PASS | Retained | Full suite |
| CSRF / Origin | Exact configured Origin for API/auth mutations; OAuth callback state on GET | Missing/null/lookalike/scheme/port/multiple/malformed Origin | Phase 9 Origin matrix; installed route inventory + Phase 1 auth callback tests | PASS | Retained; GET does not require mutation Origin | Full suite |
| cookies | HttpOnly/Lax/host-only; Secure for HTTPS; one day/hour renewal | Forged cookie and external callbacks | Phase 1 installed Better Auth options/cookie tests | PASS | Deployed browser acceptance external | Full suite |
| public/private isolation | Blank private state; distinct synthetic demo; private memory only | Switch/logout/expiry/restore failure and delayed responses | Phase 1 client transport/storage lifecycle tests; AppContext review | PASS | Rendered authenticated browser remains external | Full suite |
| cache behavior | private/no-store, Pragma no-cache, Vary Cookie on private/auth APIs | Errors before parser guard, exports/downloads/generation | Phase 1/2/8 HTTP and new Phase 9 malformed JSON test | PASS | Moved private response headers before global parser | Full suite |
| secrets | Server-only environment; ignored local files; scanner paths/rules only | Current source/build and reachable historical blobs | Current strict scan zero; 341 historical text blobs: three personal-contact markers, no tested strong key markers | UNVERIFIED | Confirm historical contact/seed provenance and release disposition; no rewrite/rotation authorized | Owner disposition needed |
| browser bundle leakage | Vite client imports exclude server; environment marker/value runtime scan | Fresh bundle and source maps | Fresh runtime:check; three hashed client files; no source maps emitted | PASS | runtime:check added to release composition | Full release |
| database ownership | Every private select/update/delete/upsert qualifies server owner; transactional revision fences | Same-ID cross-owner, rollback and stale revisions | Phase 2/4/5/6/7 SQL/handler tests and repository query review | PASS | Provider counters owner-keyed; no workspace contents in counters | Full suite |
| file ownership | Owner metadata lookup; generated UUID/private path; no permanent URL/path response | Foreign file download/delete/list; path/base64/type tricks | Phase 2 files + auth-security + Phase 8 streaming tests | PASS | Downloads and mutations consume durable budget | Full suite |
| private Blob behavior | private/access, current-read/no CDN cache; attachment/nosniff/sandbox/no-store | 404/outage/partial stream/client disconnect/ambiguous save/late put | Phase 2 compensation/reconcile and Phase 8 adapter tests | PASS | Retained saved-metadata protection; live provider deferred | Full suite |
| SSRF | Schemes/credentials/ports/local IP guard; all DNS results checked and pinned; redirects revalidated | IPv4 encodings, IPv6, mixed DNS, redirect to private, timeout/type/size/stream errors | Phase 3 safe-fetch transport fixtures + expanded Phase 9 matrix | PASS | No demonstrated bypass; safeFetch retained | Full suite |
| request validation | 3 MiB body, schemas/count/string bounds; iterative depth/node/key guard | Nested metadata/pollution-shaped keys/unknown fields/enums/oversized records | Phase 2 validation + Phase 9 atomic complexity tests | PASS | 64 depth / 100000 nodes; reserved prototype keys denied before recursive work | Full suite |
| import/export | Owner-scoped transactional import/read; server review downgrade; private unencrypted JSON | Fake verified/READY/assessment/history, duplicate and ambiguous IDs, atomic rollback | Phase 2/5/6/7 A/B fixtures; Phase 9 import bounds | PASS | Nested bounds also applied to normal save/JSON file; export PII caveat documented | Full suite |
| prompt injection | Strict structured schemas, ID envelopes and deterministic scoring/provenance | Untrusted JD/evidence/question/output cannot certify score/READY/ownership | Phase 4/5/6 injection/unknown-ID/malformed-output fixtures | PASS | Legacy gap route fenced 410; no UI caller | Full suite |
| AI privacy/minimization | Selected owner evidence only; identifier redaction; deterministic identity/manual answers | Unapproved legacy gaps; sensitive approved context/edited claim | Reviewer exact baseline gap and regenerate probes; Phase 9 model spy + Phase 5 regression | PASS | Gap fence, sensitive candidate-context exclusion before assessment/resume/regeneration; shared 30s per-call timeout | Full suite; semantic minimization not exhaustive |
| sensitive-data handling | Manual question classifier precedes Gemini; candidate-text privacy triage | Demographic/medical/legal attestations; race-condition/domain false positives | Phase 6 sensitivity tests + new Phase 9 outbound spy/domain exceptions | PASS | Shared classifier; assessment algorithm v3 invalidates prior basis without changing coefficients | Full suite; lexical limits documented |
| rate/cost abuse | DB atomic per-owner hour/day counters before provider work | Parallel requests/stolen session; conflict after spend; case/slash aliases | Phase 9 two-instance 65 reservations: 60 succeed; dual-window rollback/outage/A-B tests; reviewer alias probe | PASS | AI calls 60/hour 200/day; external/files ops 120/hour 500/day; no failed-call refund | Full suite; fixed-window burst and spend caveats |
| logging/error leakage | Generic operational logging/responses; auth library logger disabled | Provider/DB/library errors, parser errors and partial binary failure | Runtime/error tests; all console and route error review | PASS | Removed raw client error-object logging; no raw payload logging | Full suite |
| dependency advisories | Targeted qs override; documented reachability-based disposition | Two qs issues plus nested old esbuild serve advisory | Fresh full + omit-dev audits: four moderate package entries after qs fix | PASS | Four loader-chain entries accepted with concrete non-serve runtime rationale; see advisory table | npm audit + npm ls + full suite |
| dependency supply-chain posture | npm lock/ci; registry integrity; reviewed install scripts | Git/URL dependencies, alternate locks, install hooks and tree anomalies | npm ci/ls; all resolved URLs registry; runtime-check one lock | PASS | No forced major/downgrade; optional peer explanation documented | Full release |
| security headers | Express nosniff/referrer/frame deny; file sandbox CSP; Vercel static header config | Static path bypass of Express; main SPA CSP compatibility | Local runtime tests + vercel.json source review | PASS | Static header rules added; deployed headers/CSP compatibility UNVERIFIED external; no raw HTML | Local gates; deployed acceptance later |
| malformed/oversized input | Parser 3 MiB + bounded JSON + schema/file caps | Malformed JSON, oversized base64/body, deep unknown structures | Phase 2/8 parser/file tests + Phase 9 bounds | PASS | No recursive processing before guard; useful generic 400/413 | Full suite |
| concurrency/races | Transactional owner row/revisions; upload locks/intents; request ALS; durable budgets | Simultaneous writes/artifacts/transition/reconcile and cross-owner aliases | Phase 2/5/6/7/8 concurrency tests + Phase 9 budget transactions | PASS | Counter windows rollback atomically; no process-local limiter | Full suite; Neon multi-connection external |
| stale responses/session changes | Client generation fences, memory clear and server expiry checks | Logout/switch/local edit during generation and old failed requests | Phase 1 client tests; Phase 5/6/7 async adoption review | PASS | Retained; authenticated rendered browser external | Full suite |
| audit/history integrity | Owner queries; server transitions/snapshot; generic summaries; preserve certified history | Client fabricated events/snapshot, ordinary save deletion/forged certification | Phase 5/6/7 repository forgery/history/correction/rollback tests | PASS | No raw notes in audit; no automatic audit deletion; imported new backup history remains owner-confirmed | Full suite |
| release-script coverage | Typecheck/build/harness/full tests/privacy/runtime scan | Missing build, embedded server config/credentials, validator drift | release:check + Phase 9 scanner positive/negative tests | PASS | Tracked-text and maps scan; strong key/env/DB/JWT rules; runtime gate added | Full release |
| dead/stale legacy security code | All API routes owner-gated; old auth removed; legacy drafts labeled | Loose gap output/client evidence and uncertified cover letter | Installed inventory and code search; reviewer gap reproduction | PASS | Gap 410; cover letter remains uncertified, minimized no evidence payload, parsed strict output/30s timeout | Full suite |

## Findings and dispositions

| ID / severity | Attack precondition / asset / demonstrated path | Fix and regression | Residual risk / disposition |
| --- | --- | --- | --- |
| F1 MODERATE | Authorized owner sends arbitrary client gap records; baseline exact handler sent unapproved candidateEvidence/privateNotes and returned unexpected model approval keys without timeout | Unused legacy gap API returns 410. Phase 9 exact installed-handler test; reviewer baseline reproduction | Resolved. Existing reviewed evidence/assessment workflows remain authoritative; no new gap workflow |
| F2 MODERATE | Owner/stolen signed session can parallelize provider calls; revision conflicts happen after spend | Shared PostgreSQL owner/category/hour/day atomic counters; each Gemini invocation including proof batches reserved before call. External aliases normalized; file downloads/mutations reserved. Phase 9 two-instance concurrency/rollback/outage/owner tests | Resolved bounded volume. Fixed windows permit boundary bursts; limits are request counts, not currency/token caps. Failed calls retain charges. Provider account billing caps/alerts still needed later; public OAuth platform abuse remains provider-managed |
| F3 MODERATE | Owner/import writes nested loose metadata; baseline depth3000 (~33 KB) persisted then fingerprint threw RangeError, disabling generation | Iterative guard before schemas/transactions; depth64, 100000 nodes, prototype-shaped keys denied; JSON uploads also checked. Phase 9 tests preserve prior snapshot atomically | Resolved for new writes. Existing malformed legacy records require explicit reviewed repair; no destructive cleanup |
| F4 MODERATE | Approved evidence may contain medical/private context; edited claim with safe evidence envelope sent bipolar disclosure before final422 | Candidate-context exclusion before assessment/resume/regeneration model calls, including claim text; identifiers redacted; Phase 9 payload spy and Phase 5 edited-claim regression | Resolved demonstrated paths. Lexical triage is conservative and not semantic DLP. Race-condition and medical-software/booking domain exceptions preserve demonstrated ordinary work. Owner should provide concise evidence without sensitive disclosures |
| F5 LOW | Malformed JSON errors happened before owner guard/no-store; static hosting bypasses Express headers | Private headers before parser; Vercel nosniff/no-referrer/frame deny rules; Phase 9 malformed HTTP regression | Local cache fix verified; deployed static headers remain external. SPA enforcing CSP deferred until rendered deployment compatibility can be tested; React19 escaping/URL sanitation and no raw HTML mitigate demonstrated frontend injection surfaces |
| F6 INFO / UNVERIFIED | Reachable Git history contains personal-contact literals in former private seed and auth defaults | Safe history triage of 341 text blobs identifies three object/path markers; no contents copied into report. Current source/build zero findings | NOT dispositioned as synthetic. Release cannot claim history free of real PII. Authenticity/provenance and exposure/remediation decision required before Phase 10. No history rewrite, main edit or automatic rotation |

Reviewer: requested GPT-5.6 Sol High read-only security-reviewer. Baseline gap,
metadata persistence/fingerprint, repeated provider use and later edited-claim
leakage reproduced with synthetic exact-code/model/DB seams. Parent reviewed all
findings. Reviewer recheck confirms aliases/downloads and sensitive edited claims
are fenced; no remaining demonstrated defect in bounded remediation review.
React19 imported javascript-link XSS was rejected as a false positive: installed
React DOM sanitizes the URL. Public source itself is not a secret.

## Sanitized dependency advisory evidence

Fresh baseline npm audit --json and --omit=dev --json: six moderate package
entries, zero high/critical. After compatible targeted qs override and Node24
npm ci: both reports have four moderate package entries, zero high/critical.
These are four entries in one advisory chain, not four independent CVEs.

| Package | Installed baseline -> final | Direct / transitive; install class | Reachable surface | Patched version / upgrade path and risk | Disposition |
| --- | --- | --- | --- | --- | --- |
| qs | 6.15.3 -> 6.16.0 (body-parser already 6.16.0) | Transitive; runtime Express query parser | Anonymous public query parsing before guard | 6.16.0; scoped express override, compatible minor API; Express4 latest4.22.2 pins6.15.x | REMEDIATED both qs advisories; full regression/build/ci/tree checked |
| express | 4.22.2 unchanged | Direct runtime | Query parser dependency chain | No4.22.3 exists in checked registry; override qs6.16.0 instead of Express5 major | REMEDIATED advisory chain |
| esbuild | nested0.18.20 unchanged; root0.25.12 and tsx0.28.2 patched | Transitive build-loader; also present in omit-dev due optional peer | Drizzle CLI loader transforms code; no old esbuild serve call in loader or application runtime | Advisory patched0.25.0. npm recommends drizzle-kit0.18.1 downgrade; unsupported schema/Better Auth peer compatibility risk. Forcing old loader across esbuild minor series unproven | ACCEPTED MODERATE for this release audit: vulnerable serve API is not invoked. Do not introduce old esbuild serve; revisit upstream loader update |
| @esbuild-kit/core-utils | 3.3.2 unchanged | Transitive Drizzle loader | Uses old esbuild transform; package is deprecated/merged into tsx | No independent patched release in audit; same unsafe downgrade recommendation | ACCEPTED same non-serve rationale; not runtime data path |
| @esbuild-kit/esm-loader | 2.6.5 unchanged | Transitive Drizzle loader | Loads CLI config; deprecated/merged into tsx | Same downgrade recommendation; avoid broad migration-tool modernization | ACCEPTED same rationale |
| drizzle-kit | 0.31.10 unchanged | Direct dev tool + Better Auth1.7.4 optional peer >=0.31.4 | db:generate/migrate/studio CLI; no server route imports CLI/old serve | Suggested0.18.1 violates optional peer and is a backward major-range tool migration | ACCEPTED same rationale. Keep db:studio local/private; never expose a tooling dev server with career records |

Official advisory details:
[old esbuild serve CORS disclosure](https://github.com/advisories/GHSA-67mh-4wv8-2f99),
[qs bracket/comma array limit](https://github.com/advisories/GHSA-x5fp-wj9c-mxmx),
[qs attacker-controlled isBuffer denial of service](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g).
The qs comma-mode precondition is not used by Express defaults, but the shared
runtime dependency was patched rather than dismissed. npm omit-dev alone is not
runtime reachability proof: npm explain identifies Better Auth's optional
Drizzle-kit peer as the reason this tooling chain stays in that audit.

Policy: critical/high remotely reachable production advisories block release;
moderates require a compatible fix or explicit code-surface disposition; dev/build
and optional peers require supply-chain review. No blanket severity dismissal,
no npm audit fix --force, no blind downgrade. Online registry audits are recorded
separately from stable deterministic release:check; a new advisory requires fresh
review, and an unavailable audit never counts as zero advisories.

One authoritative package-lock; npm ci with scripts succeeded on Node24.19.0;
npm ls --all has no reported tree anomaly. All lock resolutions are npm registry
URLs with normal lock integrity; no git/url dependencies. Install hooks reviewed:
esbuild binary setup (three versions), optional macOS fsevents build,
protobufjs local version-scheme warning, @google/genai published preinstall no-op.
Signature/provenance verification was not run and is not claimed.

## Secrets, history and client artifacts

Strict deterministic scan now covers tracked textual source/config/docs/tests,
.env accidents, PEM private-key markers, common strong provider-key shapes,
credential-bearing database URLs, bearer/JWT literals and dist/client including
maps. Synthetic credential tests exempt only weak generic-literal triage; strong
rules still apply. Positive/negative scanner fixtures verify paths/rules only,
never echoed content. It is bounded triage, not comprehensive secret scanning/DLP.

Reachable history: 341 text blobs inspected for strong provider/private-key shapes
and personal-contact markers; three contact-marker objects remain in server.ts,
src/components/AuthModal.tsx and src/data/privateSeedTemplate.ts, including main.
Current text fixtures/defaults are blank or synthetic and the fresh current build
has zero scan findings. That does not erase historical exposure. No confirmed
credential value was found by these rules; unknown formats remain unknown. If a
real credential is later confirmed, rotation is required before release; do not
rotate automatically or quote the value. No main mutation/history rewrite performed.

Fresh client runtime scan rejects environment names/values and server DB/auth/Blob
module/URL markers. Vite production emits three hashed files and no source maps;
public source code is intentional. Existing >500kB JS warning remains operational,
not evidence of private data. Build artifacts, local DBs, PDF/DOCX, linkage and
.env are not tracked; .env.example only. .vercel remains ignored.

## Main-to-dev and migration release audit

Compared main18bde7f to baseline devb98a2a8 without merging: 139 changed files,
22280 additions/4224 deletions, mostly reviewed server contracts, tests/docs and
Drizzle snapshots. Largest tracked file is package-lock (~153KB); no unexpected
large binaries/build/private artifacts. New dependencies and all auth/workspace/
file/external-call boundaries reviewed; legacy bearer/query/email auth removed.
Initial schema creates owner-qualified tables;0001 adds optional scalars;0002 adds
upload intents; new0003 adds only provider_usage + owner FK/composite key.
No destructive SQL/drop/owner weakening. New budget data is not exported as career
workspace data. Existing application snapshots/history remain immutable under
ordinary saves; deliberate removal of a job removes its children, not other owners.

Fresh migrations and 0000/0001 ->0002 ->0003 preservation run locally in PGlite;
workspace/file/session snapshots preserved; db:generate reports no drift.
Later migration order: authorize exact nonproduction target, verify backup and
review chain -> apply migrations -> verify owner workspace/session/file/budget
smoke; only separately authorized production order after release/main/Studio.
Never delete/recreate production records as recovery. Live Neon multiple connections,
transport/locks and remote migration acceptance remain external.

Recovery: unavailable DB denies private/provider reservations with explicit retry;
logout failure clears local view and requires server retry;409 preserves local
edits until explicit reload; Blob intents/tombstones survive and reconcile protects
saved metadata; partial stream destroys transport without appended JSON. Retain
historical data; no automatic audit/history purge or tombstone deletion policy added.

## External gates carried forward

Actual Vercel generated build/Function/runtime/routing/size and deployed headers,
Google OAuth/browser cookie/lifecycle, live Neon/Private Blob and live Gemini:
PENDING_EXTERNAL_CONFIG. These are Phase 8 deferred acceptance, not Phase 9 defects.
No provider credentials, real workspace data or applications used in deterministic
tests; no Studio/PR/main merge/Vercel deployment/remote migration performed.

## Phase 10 release-candidate checklist

- Resolve historical contact/seed provenance and release exposure disposition; current zero findings does not certify history.
- Confirm current dev equals fresh origin/dev and tree is clean; review final main-to-dev diff.
- Require no unresolved critical/high demonstrated defect and explicit moderate/advisory dispositions.
- Require Node24 npm ci/tree, complete release composition, migrations and startup smoke; rerun registry advisory audit near PR.
- Carry live gates as PENDING_EXTERNAL_CONFIG; do not describe PR code readiness as production/provider acceptance.
- Require separate authorization for Phase 10 — dev -> main pull request and merge readiness. No PR or main work in this phase.

## Final local validation

Node24.19.0/npm11.12.1. npm ci with lifecycle scripts succeeded after targeted lock
update; npm ls --all succeeded. npm normalized existing optional bundled Tailwind
WASM child metadata in the lock; no Tailwind or other parent package version changed.
Full release:check passes typecheck, fresh build, harness,113/113 tests, strict
required-build privacy zero and runtime:check. Phase 9 contributes7 adversarial
tests; Phase 5 adds sensitive-edited-claim rejection; Phase 2 extends upgrade to0003.
Focused Phase 2/5/9 before final scanner fixture24/24; final full suite includes it.
Startup smoke1/1, migration fresh/upgrade preservation and db:generate no drift,
both synthetic evidence validators and diff whitespace checks pass. Client3 files,
706087 bytes; JS639.39kB existing chunk warning. No source maps emitted.

Green current-source gates support deterministic code readiness only. Overall
Phase 9 remains PARTIAL and Phase 10 readiness NO because historical contact/seed
provenance/exposure is unresolved. Phase 8 deferred live gates are not this blocker.
Next phase: **Phase 10 — dev → main pull request and merge readiness.**
Resolve the historical privacy prerequisite and obtain separate Phase 10
authorization first; do not open a PR or merge in this task.

Safe historical marker locations (blob IDs, not secret values):
server.ts blob49e933f lines28/612; AuthModal.tsx blob702c6bd line18;
privateSeedTemplate.ts blob533c45e lines17/113. These are historical blobs, not
current source line references. Confirm provenance before claiming synthetic data.
