# Validation

Last verified: 2026-08-21T08:56:44Z

## Focused Tests

Command:

`node --test azure-functions/diagnostic-ai-runner/test/packageAcceptancePaymentOptions.test.js`

Result:

- tests: 22
- pass: 22
- fail: 0

## Relay Tests

Command:

`npm test --prefix azure-functions/acs-email-relay`

Result:

- tests: 57
- pass: 57
- fail: 0

## Relay Syntax Check

Command:

`npm run lint --prefix azure-functions/acs-email-relay`

Result: PASS.

## Dependency Notes

Dependencies were installed using package lockfiles.

Local Node version: `v26.0.0`

Both changed packages declare Node `>=22 <25`, so npm emitted `EBADENGINE` warnings in the local environment. Production relay runtime readback is `Node|22`.

Diagnostic runner dependency install reported 5 npm audit findings in existing dependencies. Relay dependency install reported 0 vulnerabilities.

