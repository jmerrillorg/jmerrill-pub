# App Service Staging Certification

## Pre-Change Runtime Readback

Target: `app-jm1-pub-prod/staging`

| Setting | Before |
| --- | --- |
| `linuxFxVersion` | `NODE|20-lts` |
| `WEBSITE_NODE_DEFAULT_VERSION` | `~20` |
| `appCommandLine` | `node server.js` |
| `WEBSITE_RUN_FROM_PACKAGE` | `1` |
| `JM1_RELEASE_SHA` | `bc64b314c949cfd177b5b8e59efa1a6208cacc4a` |

## Staging Plan

1. Commit Node 24 source changes.
2. Update staging slot runtime only to `NODE|24-lts` and `WEBSITE_NODE_DEFAULT_VERSION=~24`.
3. Deploy the immutable App Service artifact to staging using the existing GitHub workflow with `deploy_production=false`.
4. Confirm staging `/api/health` returns `ready` and reports the certified head SHA.
5. Confirm no production swap is triggered.

## Post-Deployment Certification

| Check | Result |
| --- | --- |
| Branch head | Final committed PR head; exact SHA recorded in PR return package |
| Workflow run | Final staging workflow run recorded in PR return package |
| Workflow result | SUCCESS |
| Build job | PASS |
| Staging deploy job | PASS |
| Production promotion job | SKIPPED as intended (`deploy_production=false`) |
| Staging `linuxFxVersion` | `NODE|24-lts` |
| Staging `WEBSITE_NODE_DEFAULT_VERSION` | `~24` |
| Staging `JM1_RELEASE_SHA` | Matched the deployed workflow head SHA |
| Staging `/api/health` | 200, `status: ready` |
| Payment gate | `disabled` |
| Dependency health | configuration, Dataverse, Graph, ACS, artifact, Author Portal, and Stripe enrollment all `ready` |

No production swap was triggered.
