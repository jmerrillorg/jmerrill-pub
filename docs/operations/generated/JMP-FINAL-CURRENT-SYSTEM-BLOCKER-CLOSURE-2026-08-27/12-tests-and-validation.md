# Tests and Validation

Last Verified: 2026-08-27T01:50:00Z

## ACS Email Relay

Focused tests:

- Command: node --test azure-functions/acs-email-relay/test/validation.test.js azure-functions/acs-email-relay/test/enterpriseGovernedEmail.test.js azure-functions/acs-email-relay/test/acsSenderRegistry.test.js
- Result: 70 / 70 PASS

Full package:

- Command: npm ci && npm run lint && npm test
- Location: azure-functions/acs-email-relay
- Result: lint PASS; tests 90 / 90 PASS

## Diagnostic AI Runner

- Command: npm run lint && node --test test/editorialCadenceReleaseConsumer.test.js
- Location: azure-functions/diagnostic-ai-runner
- Result: lint PASS; cadence tests 17 / 17 PASS

## Root Type Check

- Command: npm run type-check
- Result: PASS

## Runtime Readback

- ACS relay function indexing: PASS
- Diagnostic Runner /api/health: 200 / ready
- Diagnostic Runner function indexing: PASS
- Establishing Glory mailbox delivery readback: PASS
- Long Watch cadence hold readback: PASS

## Environment Note

Local dependency installation emitted Node 26 warnings because the repository declares Node 24. Required checks passed; production function readback reported Node v22.23.2 for the deployed Diagnostic Runner host.
