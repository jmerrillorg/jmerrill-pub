# Validation Results

Last verified: 2026-08-13T02:00:02Z

## Repository Validation

| Check | Result |
| --- | --- |
| `npm run type-check` | PASS |
| `node --test scripts/quanishia_commercial_continuation_remediation_guard.test.mjs` | 5 / 5 PASS |
| `npm run lint` in `azure-functions/diagnostic-ai-runner` | PASS |
| Focused Function tests: `packageSelectionCommercialContinuation`, `diagnosticRecordReader`, `providerAbstraction`, `diagnosticQueueSelector` | 124 / 124 PASS |
| `npm test` in `azure-functions/diagnostic-ai-runner` | 1842 / 1842 PASS |
| Commissioning/read-model guards | 18 / 18 PASS |

## Protected Endpoint Baseline

Unauthenticated probe:

- URL: `https://func-jm1-diagnostic-ai-runner.azurewebsites.net/api/run-stage0-diagnostic`
- Result: `401 Unauthorized`

## Post-Deployment Validation

Pending merge and production deployment of this head.
