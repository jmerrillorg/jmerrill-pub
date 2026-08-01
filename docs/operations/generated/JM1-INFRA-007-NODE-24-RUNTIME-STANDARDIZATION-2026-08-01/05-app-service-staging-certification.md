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

Pending until branch head is committed and deployed to staging.

