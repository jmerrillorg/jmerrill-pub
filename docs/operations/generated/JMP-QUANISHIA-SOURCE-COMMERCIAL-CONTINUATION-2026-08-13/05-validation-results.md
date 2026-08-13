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

PR #485:

- URL: `https://github.com/jmerrillorg/jmerrill-pub/pull/485`
- Head SHA: `e99396a34b75fc4b92a69ca430de2a4f7674107f`
- Merge SHA: `aa62b91489677f4479403cc730917ae1a39f75ad`

Publishing App Service workflow:

- Run status: SUCCESS
- Head SHA: `aa62b91489677f4479403cc730917ae1a39f75ad`
- Initial push workflow built and certified staging only.
- Production promotion workflow run: `https://github.com/jmerrillorg/jmerrill-pub/actions/runs/31660186711`
- Production promotion workflow status: SUCCESS
- Production `jmerrill.pub` release after promotion: `8ea7c2ef330f75c5c786cb89f3ab8541b23893e4`
- Public/app-service production promotion: EXECUTED

Function deployment:

- Core Tools publish result: completed, but no functions indexed and protected route returned `404`
- Explicit zip deployment result: restored protected route
- Zip SHA-256: `569a3c08ecd5625f3668113cc13f1349ccbc275c5aa0be83e8b0b7792742003c`
- Protected Stage 0 route after zip deployment: `401 Unauthorized`

Live proofs:

- Quanishia Stage 0 source-correlation: PASS
- Quanishia Stage 0 execution: BLOCKED BY AZURE `429` RATE LIMIT
- `'Til Death` commercial continuation replay: PASS
- `'Til Death` Opportunity duplicate count: `0`
- `'Til Death` onboarding/agreement/business handoff statuses: READY
