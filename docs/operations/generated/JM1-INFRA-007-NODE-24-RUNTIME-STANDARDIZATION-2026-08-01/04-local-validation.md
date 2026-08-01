# Local Validation

All commands were run through a Node 24/npm 11 command wrapper:

`npx -y -p node@24 -p npm@11 -c '<command>'`

## Root Application

| Command | Result |
| --- | --- |
| `node --version` | `v24.18.1` |
| `npm --version` | `11.19.0` |
| `npm ci` | PASS |
| `npm run type-check` | PASS |
| `npm run lint` | PASS with existing font warning |
| `npm run build` | PASS with known Dataverse static-generation warnings |
| `npm run catalog-source-guard` | PASS |
| `npm run author-auth-guard` | PASS |
| `npm run royalty-import-guard` | PASS |
| `npm run program005-pipeline-guard` | PASS |
| `npm run workflow-engine-guard` | PASS |
| `npm run commercial-architecture-guard` | PASS |
| `npm run workspace-integrity-guard` | PASS |
| `npm run author-communication-brand-guard` | PASS |

## Explicit App Service Workflow Tests

| Command | Result |
| --- | --- |
| `node scripts/check-catalog-runtime-source.mjs` | PASS |
| `node scripts/infra006_health_contract.test.mjs` | PASS, 4/4 |
| `node scripts/program002_author_portal_access.test.mjs` | PASS, 13/13 |
| `node scripts/author_external_id_claim_resolution.test.mjs` | PASS |
| `node --test scripts/author_activation_recovery_governance.test.mjs` | PASS, 9/9 |

## Azure Functions

| Project | Command | Result |
| --- | --- | --- |
| `azure-functions/acs-email-relay` | `npm ci && npm run lint && npm test` | PASS, 43/43 tests |
| `azure-functions/diagnostic-ai-runner` | `npm ci && npm run lint && npm test` | PASS, 1757/1757 tests |

## Local Standalone Artifact

| Check | Result |
| --- | --- |
| `npm run package:appservice` | PASS |
| ZIP checksum validation | PASS |
| Targeted ZIP inspection for `server.js` | PASS |
| Targeted scan for active Node 20 declarations in standalone/build/runtime files | PASS, none found |
| `node .next/standalone/server.js` under Node 24 | PASS |
| Local `/api/health` | PASS response, `degraded` only because local governed Azure secrets were absent |

