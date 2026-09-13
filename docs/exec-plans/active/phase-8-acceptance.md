# Phase 8 acceptance — runtime contract

Baseline: clean dev == freshly fetched origin/dev at bec000ba171c2eb40342e518727af058fda6f880.
Scope: retain Vite static client and one Node Express Function; certify routing,
lifecycle/concurrency, configuration, build and all existing deterministic gates.
No Phase 9, main/PR/Studio, production deployment or remote resource mutation.
Provider contracts verified by the requested read-only docs researcher and parent
installed-SDK inspection. Final deferred-gate status:
**PARTIAL — code/runtime contract accepted locally; external Vercel/provider acceptance deferred until a Vercel project and isolated staging resources exist.**
The deterministic/local Vercel-compatible contract is verified. Missing project
setup is deferred external configuration, not a demonstrated architecture defect.
The previous requirement to resolve platform gates before Phase 9 is superseded by
the user's deferral instruction. Next: **Phase 9 — Security/privacy/release audit**,
on separate authorization; not begun in this continuation.

| Requirement | Current behavior | Official provider contract | Status | Required fix / evidence |
| --- | --- | --- | --- | --- |
| Framework/runtime | Vite static + one Node api/index.ts Express adapter | Vercel supports Vite/Express Functions [1][2] | Pass (design) | Actual generated Function count pending |
| Package manager | npm ci; package-lock only, Bun lock removed | Bun lock otherwise precedes npm [3] | Pass | Node 24 npm ci succeeds; no dependency version changes |
| Node version | 24.x; local 24.19.0, host 25 excluded | Supported 24.x; engines overrides dashboard [4] | Pass | Explicit test/runtime-check major invariant |
| Client build/assets | dist/client/index.html + hashed JS/CSS | Vite static build; configured output [1][5] | Pass | Final 3 files, 706107 bytes; client JS 639.41 kB warning retained; synthetic server-env sentinel build scan passes |
| SPA deep links | Root/dashboard/other route fallback; excludes API/assets | SPA rewrite to index.html [6] | Pass locally / Unverified live | Bare /api exclusion fixed; preview root/assets/deep links pending |
| API/nested paths | /api/:path* -> /api; adapter never edits req.url | Internal rewrites; exact Express incoming URL not specified [6][7] | Pending external project setup | Synthetic methods/query/nested paths pass; actual rewrite preservation deferred, not a demonstrated defect |
| Express lifecycle | finish/close/error/abort/290s deadline; listeners removed | Node response lifecycle, Function duration [2][8] | Pass locally | Synthetic normal/throw/close/abort/error/timeout/stream tests; close once |
| Concurrent invocation | ALS DB; auth WeakMap per DB | Fluid concurrent instance reuse [2][8] | Pass locally | Interleaved two owners/data/errors/artifacts; late DB work rejects |
| Duration | 300s; adapter 290s; AI 30s/call, Blob 15s, DB connect 10s/close 5s | Fluid default/Hobby maximum 300s [8] | Pass configured / Unverified workload | Sequential 12-claim proof batches justify >30s; large live proof completion not certified |
| Request size | JSON 3 MiB; file 2 MiB encoded ~2.80 MB | Provider 4.5 MB request cap [8] | Pass locally | Exact encoded file under app cap; malformed 400 and oversized 413 JSON |
| Response/bundle size | Private stream 2 MiB; large workspace exports possible | 4.5 MB response/250 MB uncompressed bundle [8] | Unverified | Actual Function bundle and maximum-size JSON response acceptance pending; shell size is not Function size |
| Environment/secrets | All server-only; runbook local/preview/production matrix | Vercel scopes; implicit OIDC [5][9] | Pass policy / Unverified remote | No values committed; ordinary preview unconfigured; stable staging branch only |
| Public demo/health | Static synthetic fixtures; lazy providers; cheap public health | Static frontend + Node Function [1][2] | Pass locally | Built no-config root/assets and source adapter health/private-unavailable smoke; no provider calls |
| Auth canonical origin/Google callback | Exact HTTPS config; /api/auth/callback/google | Better Auth baseURL/Google registered redirect [10][11] | Pass deterministic / Unverified live | No Host-derived trust; live Google acceptance pending |
| Preview auth | Ephemeral public; stable explicitly configured private staging | Dynamic baseURL is optional, not required [12] | Pass policy / Unverified remote | No wildcard vercel.app/proxy adopted; exact separate origin/callback/resources |
| Cookies/mutation Origin/proxy | HttpOnly/Lax/Secure, host-only; exact Origin; no trust proxy | Better Auth host-only default; configured secure cookies [11][13] | Pass deterministic / Unverified browser | Existing real synthetic cookie/expiry/logout tests; deployed browser/OAuth still pending |
| Neon lifecycle/transactions | Lazy request-local Pool/Drizzle; closed fence; 5s cleanup wait | WebSocket interactive transactions, create/use/close per request [14] | Pass local contracts / Unverified transport | Failed/missing config, concurrent isolation, end/late/recreation/stuck-close; existing transaction/rollback tests |
| Runtime/data region | No selected Neon/Function region pair | Choose region near database [5][14] | Unverified external | Document actual pair before region pin; do not guess |
| Migrations | Reviewed chain; db:generate no drift; additive upgrade tests | Explicit authorized database target [14] | Pass locally / Unverified remote | Runbook target/backup/authorization -> db:migrate -> preservation smoke; no remote migration |
| Blob authentication | Installed 2.8.0 implicit OIDC+store preferred; static outside Vercel | OIDC managed refresh; outside-Vercel token [9] | Pass SDK contract / Unverified live | Installed resolver tests prove OIDC without static token, precedence, fallback and missing config; live grant/refresh pending |
| Private Blob reads | private/useCache:false, server-mediated; no permanent URLs | Private current-read SDK options [9] | Pass deterministic / Unverified CDN | Retain Phase 2 options and metadata boundary |
| Upload/download/delete | Owner intents/compensation/reconcile/delete retry unchanged | Node SDK and private streams [9] | Pass deterministic / Unverified provider | Prior Phase 2 fault/isolation/restart tests; new 2 MiB stream/error/disconnect cleanup |
| Preview isolation | Public ephemeral; nonproduction DB/store/credentials for stable staging | Scoped environments/OIDC store connection [5][9] | Pass documented / Unverified configured | Never connect production career records for preview smoke |
| Production isolation | Production-only canonical origin/DB/store/secrets | Production scope [5][9] | Pass documented / Unverified configured | Production not deployed; release order preserved |
| Logging/errors/headers | Library raw auth logging disabled; generic JSON; private no-store | Application Node responses [2] | Pass bounded local review | Found raw synthetic Better Auth errors; disabled logger regression. No headers-sent JSON; live static headers pending |
| Reproducibility | Fresh committed-source archive: Node 24 npm ci/typecheck/105 tests/build/runtime scan with no .env or untracked files | Vercel explicit install/build settings [3][5] | Pass locally | Independent clean source reproduces same assets; sandbox cache/network install failed; authorized rerun succeeded; six moderate npm advisories deferred to Phase 9 |
| Vercel build/runtime | No CLI/project link available | Current linked CLI/account workflow [5] | Unverified | Local adapter is not Vercel CLI; actual routes/Function/runtime/size pending |
| Live preview/providers | No authorized nonproduction resources | Actual configured providers required | Unverified | Status matrix below; no remote resources created or production deployment |
| Filesystem persistence/cold reuse | Neon/Blob only; no server durable filesystem writes | Ephemeral Function filesystem [2] | Pass source/local recreation | Pool recreation + existing disk-backed synthetic DB restart contracts; live cold/reuse pending |

## Results
Focused Phase 8 10/10; final full 105/105, release composition, runtime client scan,
migration drift, both evidence validators, startup smoke and diff check pass.
Publication recorded in productionization.md. Initial focused header failure was the outer test harness's
x-powered-by header, fixed by disabling it in that harness. Initial OIDC fixture
was not JWT-shaped; corrected to a synthetic unexpired payload (no signature
verification/live authentication claimed). Neither fix weakened provider assertions.

| Provider gate | Status | Evidence |
| --- | --- | --- |
| Deterministic/local Vercel-compatible contract | VERIFIED | Prior Node 24/npm/build/adapter and 105/105 tests accepted; not rerun for this documentation-only deferral |
| Actual Vercel generated build/Function output | PENDING_EXTERNAL_CONFIG | Pending external project setup; no .vercel/project.json; CLI probing incomplete at prior usage cutoff |
| Actual Vercel routing/path preservation | PENDING_EXTERNAL_CONFIG | Pending external project setup; no actual platform proof claimed |
| Deployed SPA/deep-link acceptance | PENDING_EXTERNAL_CONFIG | Pending external project setup; no deployment performed |
| Largest-response provider acceptance | PENDING_EXTERNAL_CONFIG | Pending external project setup; synthetic/local acceptance is not provider-limit proof |
| Google OAuth live acceptance | PENDING_EXTERNAL_CONFIG | Pending stable staging configuration |
| Neon live acceptance | PENDING_EXTERNAL_CONFIG | Pending non-production resource configuration |
| Private Blob live acceptance | PENDING_EXTERNAL_CONFIG | Pending non-production Vercel configuration |
| Gemini live acceptance | PENDING_EXTERNAL_CONFIG | Pending key/configuration |

## Official contracts (checked 2026-09-13)

[1]: https://vite.dev/guide/static-deploy
[2]: https://vercel.com/docs/frameworks/backend/express
[3]: https://vercel.com/docs/functions/runtimes/node-js
[4]: https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
[5]: https://vercel.com/docs/project-configuration
[6]: https://vercel.com/docs/routing/rewrites
[7]: https://expressjs.com/en/4x/api/request/
[8]: https://vercel.com/docs/functions/limitations
[9]: https://vercel.com/docs/vercel-blob/using-blob-sdk
[10]: https://better-auth.com/docs/authentication/google
[11]: https://better-auth.com/docs/reference/options
[12]: https://better-auth.com/docs/guides/dynamic-base-url
[13]: https://better-auth.com/docs/concepts/cookies
[14]: https://neon.com/docs/serverless/serverless-driver
