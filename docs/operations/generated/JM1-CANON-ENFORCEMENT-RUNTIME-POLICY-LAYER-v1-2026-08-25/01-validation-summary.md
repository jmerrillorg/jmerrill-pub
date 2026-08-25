# Validation Summary

Last verified: 2026-08-25

## Checks Run

| Check | Result |
| --- | --- |
| `npm run jm1-runtime-policy-layer-guard` | PASS, 10 / 10 |
| `npm --prefix azure-functions/diagnostic-ai-runner run lint` | PASS |
| `npm --prefix azure-functions/acs-email-relay run lint` | PASS |
| `node --test azure-functions/diagnostic-ai-runner/test/agreementPaymentLinkRunner.test.js azure-functions/diagnostic-ai-runner/test/fullWrapExecutor.test.js azure-functions/diagnostic-ai-runner/test/editorialAuthorGatePolicy.test.js` | PASS, 44 / 44 |
| `npm --prefix azure-functions/acs-email-relay test` | PASS, 61 / 61 |
| `npm run type-check` | PASS |
| `npm run jm1-canon-guard-enforcement` | PASS, 53 / 53 |
| `node scripts/jm1_runtime_policy_drift_audit.mjs` | PASS, evidence emitted |

## Environment Notes

Root and Function dependencies were installed from existing lockfiles with `npm ci`.

The local runtime was Node `v26.0.0`; repository engines declare Node 24 for the app and ACS relay, and `>=22 <25` for the diagnostic runner. Engine warnings were preserved and not hidden.

`npm ci` reported existing dependency-audit findings in the root app and diagnostic runner. No dependency upgrade or audit remediation was performed under this work item.

