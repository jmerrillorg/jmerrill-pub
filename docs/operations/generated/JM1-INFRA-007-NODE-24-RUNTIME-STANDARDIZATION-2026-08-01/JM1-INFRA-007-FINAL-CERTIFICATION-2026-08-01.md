# JM1-INFRA-007 Final Certification

Program: JM1 Enterprise Completion Sprint
Work item: JM1-INFRA-007 - Node.js 24 Runtime Standardization
Date: 2026-08-01
Authority: Jackie Smith, Jr. completion and production certification authorization, 2026-08-01
Final classification: NODE 24 STANDARDIZATION COMPLETE - DOCUMENTED HOSTING PLATFORM EXCEPTIONS REMAIN

## Executive Summary

JM1-INFRA-007 is complete at the authorized production boundary.

Node 24 was commissioned for the active Publishing App Service path, including local development authority, CI, App Service infrastructure, staging deployment, production runtime configuration, and production release validation.

Node 22 remains only where the hosting platform or transitional deployment path requires it:

- Azure Functions live host runtime remains Node 22 after the Node 24 host smoke path returned 503 and rollback restored protected-route 401 behavior.
- Azure Static Web Apps remains Node 22 because the SWA deployment action rejected Node 24 and listed supported versions as 18, 20, and 22; SWA is a legacy deployment path scheduled for retirement behind App Service.

No author communication, package release, lifecycle advancement, payment, Stripe money movement, Business Central posting, DNS change, or Static Web Apps retirement occurred during final certification.

## Before / After Runtime Matrix

| Platform | Before | Final active runtime | Support status | Exception | Migration path |
| --- | --- | --- | --- | --- | --- |
| Local development | Node 20 implied / unpinned | Node 24 via `.nvmrc` and package engines | Supported | No | Maintain Node 24 current production release line |
| Root package metadata | `@types/node` Node 20; no explicit Node 24 engine | Node `>=24 <25`; npm `>=11 <12`; `@types/node` 24 | Supported | No | Keep with active Node LTS/current production policy |
| GitHub App Service CI | `NODE_VERSION=20` | `NODE_VERSION=24` with runtime proof step | Supported | No | Continue App Service workflow as production authority |
| App Service infrastructure | `NODE|20-lts`; `WEBSITE_NODE_DEFAULT_VERSION=~20` | `NODE|24-lts`; `WEBSITE_NODE_DEFAULT_VERSION=~24` | Supported | No | IaC remains canonical runtime authority |
| Publishing App Service staging | Node 20 | `NODE|24-lts`; `~24` | Supported | No | Staging remains promotion gate |
| Publishing App Service production | Node 20 | `NODE|24-lts`; `~24` | Supported | No | Production certified on release `77230c077f37910f75cf7b274734475ac1a92d3e` |
| Azure Functions source packages | Node 20-adjacent metadata | Node `>=22 <25` compatibility boundary; lockfiles regenerated under Node 24/npm 11 | Source-compatible | Host exception | JM1-INFRA-010 Flex Consumption / Function-host modernization discovery |
| Azure Functions live host runtime | Node 22 | Node 22 | Supported last-known-good host runtime | Yes | Future Function-host modernization; do not extend INFRA-007 |
| Azure Static Web Apps preview | Legacy Node 20/default path | Node 22 | Newest supported SWA deployment runtime observed | Yes | Retire SWA path under App Service migration; do not force Node 24 |

## Merge Evidence

| Field | Result |
| --- | --- |
| Pull request | `#369` |
| PR URL | `https://github.com/jmerrillorg/jmerrill-pub/pull/369` |
| Source branch | `codex/node-24-runtime-upgrade` |
| Certified PR head in original directive | `b651a1d2842e9abddc06e9d76885fd19aeb4dc7b` |
| Live PR head before merge | `680308d75970d3b66b8f93a6f07f3b4d150cb8e7` |
| Re-certification disposition | Required because the PR head changed; completed before merge |
| Merge commit | `77230c077f37910f75cf7b274734475ac1a92d3e` |
| Merge timestamp | `2026-08-01T08:06:02Z` |
| Merged by | `jmerrillorg` |
| Merge method | GitHub merge commit |
| Default branch readback | `origin/main` = `77230c077f37910f75cf7b274734475ac1a92d3e` |

## Required Check Disposition

The failed PR check was accepted as a narrow governed exception for PR #369 at head `680308d75970d3b66b8f93a6f07f3b4d150cb8e7` only.

| Check area | Result |
| --- | --- |
| Local validation | PASS |
| Root guards | PASS |
| App Service staging certification | PASS |
| Azure Functions source/package validation | PASS |
| Azure Functions live host runtime | Node 22 retained as documented hosting exception |
| Static Web Apps Node 24 path | Unsupported by observed SWA deploy action |
| Static Web Apps Node 22 path | Build/guard path completed; deployment blocked by max staging-environment capacity |

This exception is not a permanent bypass and does not establish precedent for unrelated checks.

## Re-Certification Results

Re-certification ran on a clean worktree at PR head `680308d75970d3b66b8f93a6f07f3b4d150cb8e7` using Node `v24.11.0` and npm `11.6.1`.

| Command / validation | Result |
| --- | --- |
| `npm ci` | PASS; dependency deprecation/audit warnings only |
| `npm run type-check` | PASS |
| `npm run lint` | PASS; known `app/layout.tsx` custom-font warning |
| `npm run build` | PASS; known local Dataverse catalog static-generation warnings |
| `npm run catalog-source-guard` | PASS |
| `npm run author-auth-guard` | PASS |
| `npm run royalty-import-guard` | PASS |
| `npm run program005-pipeline-guard` | PASS |
| `npm run workflow-engine-guard` | PASS |
| `npm run commercial-architecture-guard` | PASS |
| `npm run workspace-integrity-guard` | PASS |
| `npm run author-communication-brand-guard` | PASS |
| Direct App Service / author activation scripts | PASS |
| Diagnostic AI runner Function package | PASS: 1757/1757 tests |
| ACS email relay Function package | PASS: 43/43 tests |
| INFRA-007 evidence checksums | PASS |
| `git diff --check` | PASS |
| Changed-file secret scan | No secret values; protected GitHub secret reference name only |

## Production Deployment

| Field | Result |
| --- | --- |
| Workflow | Publishing App Service CI/CD |
| Production run | `30691248141` |
| Run URL | `https://github.com/jmerrillorg/jmerrill-pub/actions/runs/30691248141` |
| Trigger | `workflow_dispatch` with `deploy_production=true` |
| Source SHA | `77230c077f37910f75cf7b274734475ac1a92d3e` |
| Created | `2026-08-01T08:10:55Z` |
| Completed | `2026-08-01T08:18:47Z` |
| Overall result | SUCCESS |

| Job | Result | Completed |
| --- | --- | --- |
| Build Immutable App Service Artifact | SUCCESS | `2026-08-01T08:11:58Z` |
| Deploy App Service Staging | SUCCESS | `2026-08-01T08:12:47Z` |
| Promote Staging To Production | SUCCESS | `2026-08-01T08:18:46Z` |

Promotion job completed Azure login, staging-to-production slot swap, and production observation successfully.

## Production Runtime Readback

| Item | Result |
| --- | --- |
| Production `linuxFxVersion` | `NODE|24-lts` |
| Production `WEBSITE_NODE_DEFAULT_VERSION` | `~24` |
| Production `JM1_RELEASE_SHA` | `77230c077f37910f75cf7b274734475ac1a92d3e` |
| Production payment gate | `JM1_STRIPE_COMMISSIONING_PAYMENT_ENABLED=false` |
| Health check path | `/api/health` |
| Always On | `true` |

Production runtime readback initially showed the Node 24 artifact live while the production slot still reported the prior runtime setting. Cody corrected only the required production runtime settings and non-secret release marker:

- `linuxFxVersion=NODE|24-lts`
- `WEBSITE_NODE_DEFAULT_VERSION=~24`
- `JM1_RELEASE_SHA=77230c077f37910f75cf7b274734475ac1a92d3e`

Health immediately returned ready after the correction.

## Production Validation

| Probe | Result |
| --- | --- |
| `https://jmerrill.pub/api/health` | `200`; `status=ready`; release `77230c077f37910f75cf7b274734475ac1a92d3e`; payment gate `disabled` |
| `https://app-jm1-pub-prod.azurewebsites.net/api/health` | `200`; same release |
| `https://jmerrill.pub/` | `200` after post-restart warmup |
| `https://jmerrill.pub/join` | `200` after post-restart warmup |
| `https://app-jm1-pub-prod.azurewebsites.net/` | `200` |
| `https://app-jm1-pub-prod.azurewebsites.net/join` | `200` |
| `/api/author/context` unauthenticated | `401` |
| `/api/author/activation/complete` unauthenticated POST | `401` |
| `/api/publisher/operating-center` unauthenticated | `401` |
| `/api/publishing/intake/config` | `200` |

Health dependency readback showed configuration, Dataverse, Microsoft Graph / SharePoint, ACS notification relay, artifact configuration, Author Portal session configuration, and Stripe enrollment configuration as `ready` at presence level without exposing secret values.

## Publishing Safety Validation

The production deployment and runtime correction did not perform any business workflow action.

| Safety check | Result |
| --- | --- |
| Package release | 0 performed |
| Author notification | 0 sent |
| Lifecycle stage advancement | 0 performed |
| Unexpected Dataverse record write | 0 known; no business mutation route invoked |
| Duplicate execution event generation | 0 known; no execution-event route invoked |
| Title status change | 0 performed |
| Stripe onboarding / charge / transfer / refund / payout | 0 performed |
| Payment gate activation | 0; payment gate remains disabled |
| Business Central posting | 0 performed |

Workflow log scan for run `30691248141` found zero secret-value pattern hits. It contained only standard GitHub/Azure action labels and deprecation annotations.

## Azure Functions Findings

| Function App | Resource group | Final host runtime classification | Source package result | Migration recommendation |
| --- | --- | --- | --- | --- |
| `func-jm1-acs-email-relay` | `rg-jm1-communications` | Node 22 required for current live host posture | PASS under package compatibility boundary; 43/43 tests | JM1-INFRA-010 discovery; do not alter in INFRA-007 |
| `func-jm1-diagnostic-ai-runner` | `rg-jm1-ai` | Node 22 required for current live host posture | PASS under package compatibility boundary; 1757/1757 tests | JM1-INFRA-010 discovery; do not alter in INFRA-007 |
| `jm1-ed-functions` | `jm1-core-services` | Inventory only; outside active package changes in this PR | Not changed | Include in future Function estate discovery |
| `func-jm1-foundation-intake` | `func-jm1-foundation-intake_group` | Inventory only; outside active package changes in this PR | Not changed | Include in future Function estate discovery |

The rollback to Node 22 is accepted for active Function host runtime. No further runtime upgrade attempt was made during final certification.

## Static Web Apps Findings

Static Web Apps remains a legacy deployment path and should not block INFRA-007 closure.

| Finding | Result |
| --- | --- |
| SWA Node 24 deploy support | Not supported in observed deploy action; accepted versions listed as 18, 20, 22 |
| SWA current configured PR runtime | Node 22 |
| SWA PR result for #369 | Build/guards completed; deployment blocked by max staging-environment capacity |
| Production responsibility | App Service is the certified production path for Publishing |
| Retirement recommendation | Retire SWA path under App Service migration governance; do not force Node 24 |

## Platform Exceptions

| Exception ID | Description | Blocking for INFRA-007 closure | Future work |
| --- | --- | --- | --- |
| INFRA-007-EX-FUNC-001 | Active Function host runtime remains Node 22 after live Node 24 host smoke failed and rollback restored safe behavior | No | JM1-INFRA-010 |
| INFRA-007-EX-SWA-001 | Static Web Apps deploy action does not support Node 24 and is capacity-blocked for preview deployment | No | SWA retirement under App Service migration |
| INFRA-007-EX-DEP-001 | npm audit/deprecation posture remains a dependency-modernization concern | No | JM1-INFRA-011 |
| INFRA-007-EX-OTEL-001 | Azure Monitor OpenTelemetry migration remains a platform-modernization item | No | JM1-INFRA-009 |

## Rollback Confirmation

Rollback remains available through the existing App Service slot-swap path and immutable workflow artifact retention.

The production workflow did not trigger swap-back because production observation passed. The prior production release can be restored through governed slot swap if a later regression is found.

## Future Work Register

| Work item | Scope | Status |
| --- | --- | --- |
| JM1-INFRA-008 | Next.js 16 modernization discovery | Future discovery only |
| JM1-INFRA-009 | Azure Monitor OpenTelemetry migration discovery | Future discovery only |
| JM1-INFRA-010 | Azure Functions Flex Consumption / Function-host modernization discovery | Future discovery only |
| JM1-INFRA-011 | Production dependency modernization discovery | Future discovery only |

No implementation for these future work items began during INFRA-007 final certification.

## Final Conclusion

Node 24 was successfully commissioned where the hosting platform supports it.

Node 22 remains only where Microsoft hosting currently requires or safely supports it.

Every active production workload uses the latest officially supported production runtime for its current hosting platform, every exception is documented, production deployment is certified, and the remaining modernization items are separated into future governed workstreams.

Final classification:

NODE 24 STANDARDIZATION COMPLETE - DOCUMENTED HOSTING PLATFORM EXCEPTIONS REMAIN
