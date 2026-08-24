# Validation

Last Verified: 2026-08-24T20:18:42Z

## Commands

| Check | Result |
| --- | --- |
| `node --test scripts/stripe_billing_secret_permission_contract.test.mjs` | `PASS` |
| `node --test scripts/indomitable_executed_agreement_billing_guard.test.mjs` | `PASS` |
| Live Quanisha invoice readback | `PASS` |
| Current Key Vault secret permission probe | `FAIL EXPECTED / UNDER-SCOPED KEY CONFIRMED` |

## Runtime Boundary

The current route does not need redesign. It needs a Stripe restricted key whose permissions match the already-deployed billing route.

## Final State

`STRIPE_APP_NATIVE_BILLING_READY = NO`

`OPERATOR_CLI_REQUIRED_FOR_NEXT_AUTHOR = YES`

This evidence package should be updated after Dashboard-managed key replacement and a passing permission probe.
