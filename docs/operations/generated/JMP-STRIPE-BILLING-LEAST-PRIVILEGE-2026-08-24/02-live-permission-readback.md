# Live Permission Readback

Last Verified: 2026-08-24T20:18:42Z

Command pattern:

`az keyvault secret show --vault-name jm1-core-vault --name STRIPE-CHECKOUT-SECRET-KEY --query value -o tsv | [secret-safe probe]`

The secret value was held only in process memory and was not printed.

## Current Key Results

| Probe | Result | Stripe response |
| --- | --- | --- |
| `STRIPE_APP_SECRET_AUTH` | `FAIL` | `403 / more_permissions_required` |
| `CUSTOMER_READ` | `FAIL` | `403 / more_permissions_required` |
| `INVOICE_READ` | `FAIL` | `403 / more_permissions_required` |
| `PAYMENT_INTENT_READ` | `PASS` | `200` |
| `CHARGE_READ` | `FAIL` | `403 / more_permissions_required` |
| `CUSTOMER_CREATE_AUTHORITY` | `FAIL` | `403 / more_permissions_required` |
| `INVOICE_ITEM_CREATE_AUTHORITY` | `FAIL` | `403 / more_permissions_required` |
| `INVOICE_CREATE_AUTHORITY` | `FAIL` | `403 / more_permissions_required` |
| `INVOICE_FINALIZE_AUTHORITY` | `FAIL` | `403 / more_permissions_required` |

## Interpretation

The existing restricted key is real and partially functional, but it is not the production billing key required by the governed first-payment route.

This is a Stripe restricted-key permission defect, not a route rewrite requirement.
