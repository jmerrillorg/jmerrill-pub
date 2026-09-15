# Durability Guards

Last verified: 2026-08-13T23:58:30Z

## Provider Request Contract

| Guard | Result |
|---|---|
| `azureOpenAiProvider.test.js` verifies Azure prompt-only JSON contract by default | PASS |
| `azureOpenAiProvider.test.js` verifies JSON response format is opt-in only | PASS |
| `azureOpenAiProvider.test.js` verifies sanitized Azure 400 detail without prompt/manuscript leak | PASS |
| Quanishia remediation guard blocks obsolete tool-call prompt language | PASS |
| Quanishia remediation guard blocks hard-coded Azure `response_format` reintroduction | PASS |

## Deployment Drift

| Guard | Result |
|---|---|
| Production `JM1_RELEASE_SHA` readback matches canonical SHA | PASS |
| `run-stage0-diagnostic` trigger indexed | PASS |
| Protected no-key route returns 401 | PASS |
| `WEBSITE_RUN_FROM_PACKAGE` absent | PASS |
| Package-access hygiene guard found no SAS-bearing package URLs | PASS |
| Runtime readback remains `Node|22` | PASS |

## Test Status

| Check | Result |
|---|---|
| `node --test test/azureOpenAiProvider.test.js` | 3 / 3 PASS |
| `node --test scripts/quanishia_commercial_continuation_remediation_guard.test.mjs` | 6 / 6 PASS |
| `npm run lint` in `azure-functions/diagnostic-ai-runner` | PASS |
| `npm test` in `azure-functions/diagnostic-ai-runner` | 1857 / 1860 PASS |

The remaining 3 failures are the unrelated existing `agreementGeneratedPackageMirror.test.js` cluster and are not shared-root-cause evidence for Stage 0.

## Durable Certification Status

Durability guards are active for the former 400/deployment-drift class, but Wave 1 is not durably certified until the real manuscript completes model success, validation, Dataverse writeback, and routing.

