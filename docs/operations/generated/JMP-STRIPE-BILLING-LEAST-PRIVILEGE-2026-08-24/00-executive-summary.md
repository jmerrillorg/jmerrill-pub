# JMP Stripe Billing Least-Privilege Production Authority

Last Verified: 2026-08-24T20:18:42Z

## Classification

`STRIPE_PRODUCTION_SECRET_PERMISSION_GAP` remains open pending Stripe Dashboard restricted-key replacement or amendment.

The production route and Key Vault wiring are present, but the current `STRIPE-CHECKOUT-SECRET-KEY` restricted key is under-scoped for app-native invoice billing.

## Current Finding

The production app setting `STRIPE_CHECKOUT_SECRET_KEY` is a Key Vault reference to:

`jm1-core-vault / STRIPE-CHECKOUT-SECRET-KEY`

Secret values were not printed, committed, or stored in repository evidence.

The current key can read the Quanisha PaymentIntent, but cannot read the invoice, customer, or charge and cannot create customer, invoice item, invoice, or finalize invoice objects. Stripe returned `more_permissions_required` for those required operations.

## Live Billing Fixture

Quanisha / Indomitable existing objects were read back only.

| Object | Value |
| --- | --- |
| Customer | `cus_V8DlN4Jeu1jDBi` |
| Invoice | `in_1U7xLRJCiOVFpgYu1SKo9kgC` |
| Invoice number | `QXKWX2LC-0001` |
| Amount paid | `$209.06` |
| Status | `paid` |
| PaymentIntent | `pi_3U7xLSJCiOVFpgYu1ABnQR6G` |
| Charge | `ch_3U7xLSJCiOVFpgYu1VuBLXtf` |
| Success event | `evt_1U7yLhJCiOVFpgYusvcMXT3j` |

No duplicate invoice, customer, payment request, or author email was created.

## Required Key Resolution

Stripe documentation states restricted API keys are created and managed through the Stripe Dashboard. The local Stripe CLI did not expose a restricted-key create/update path. Therefore the governed repair requires Dashboard creation/amendment of a live restricted key, then immediate storage in Key Vault under the existing governed secret name.

Required restricted-key permissions:

- Customers: Read and Write.
- Invoice Items: Write.
- Invoices: Read and Write, including finalize.
- PaymentIntents: Read.
- Charges: Read.

## Regression Protection Added

- `scripts/stripe_billing_secret_permission_probe.mjs`
- `scripts/stripe_billing_secret_permission_contract.test.mjs`
- `npm run stripe-billing-secret-permission-contract-guard`

The probe is secret-safe and uses non-mutating validation probes for write permissions.

## Negative Proof

| Control | Result |
| --- | --- |
| Quanisha billing resent | `0` |
| Quanisha duplicate invoice/customer created | `0` |
| Stripe secret printed | `0` |
| Stripe secret committed | `0` |
| Dataverse mutation | `0` |
| Business Central mutation | `0` |
| Author communication | `0` |
| Existing invoice altered | `0` |

## Readiness

`STRIPE_APP_NATIVE_BILLING_READY = NO`

`OPERATOR_CLI_REQUIRED_FOR_NEXT_AUTHOR = YES`

This remains true until the restricted key is amended/replaced and the permission probe returns all required rows as `PASS`.
