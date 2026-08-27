# Secret Rotation Handoff

Last Verified: 2026-08-24T20:18:42Z

## Governing Location

Use the existing governed production secret:

`jm1-core-vault / STRIPE-CHECKOUT-SECRET-KEY`

Do not introduce a second active app setting or commit secret material.

## Stripe Dashboard Requirement

Stripe documentation states API keys, including restricted keys, are created and managed in the Stripe Dashboard.

Required Dashboard action:

1. Create or amend a live restricted key for JMP Publishing billing.
2. Grant only the required permissions:
   - Customers: Read and Write.
   - Invoice Items: Write.
   - Invoices: Read and Write.
   - PaymentIntents: Read.
   - Charges: Read.
3. Copy the key exactly once.
4. Store it immediately as a new version of `STRIPE-CHECKOUT-SECRET-KEY` in `jm1-core-vault`.
5. Restart or refresh the production App Service Key Vault reference if needed.
6. Run `scripts/stripe_billing_secret_permission_probe.mjs` using the production app secret source.

## Acceptance

The secret repair is complete only when the probe returns:

- `STRIPE_APP_SECRET_AUTH = PASS`
- `CUSTOMER_READ = PASS`
- `CUSTOMER_CREATE_AUTHORITY = PASS`
- `INVOICE_ITEM_CREATE_AUTHORITY = PASS`
- `INVOICE_CREATE_AUTHORITY = PASS`
- `INVOICE_FINALIZE_AUTHORITY = PASS`
- `PAYMENT_INTENT_READ = PASS`
- `CHARGE_READ = PASS`

No author billing, duplicate invoice, or communication is required to validate this authority.
