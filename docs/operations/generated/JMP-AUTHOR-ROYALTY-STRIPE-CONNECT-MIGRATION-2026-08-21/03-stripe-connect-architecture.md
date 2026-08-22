# Stripe Connect Architecture

Last Verified: 2026-08-22T00:09:38Z

## Current Canonical Implementation

Current implementation package:

`docs/implementation/Author-Payout-Enrollment-Governance-Alignment-Implementation-Package-2026-07-27.md`

Current royalty/payout standard:

`docs/implementation/JM1-PAY-001-Author-Payout-Royalty-Governance-Standard-v1.0.md`

The active implementation package adopts:

```text
Author Payout Enrollment
Stripe Connect account type: standard
country: US
business_type: individual
No card_payments capability request
No transfers capability request during enrollment account creation
```

Account creation and account-link generation are enrollment-only. They must not initiate charges, transfers, refunds, payouts, customer payments, royalty generation, or Business Central posting.

## Production Configuration Readback

Azure resource:

```text
Resource group: rg-jm1-web-prod-premium
Web app: app-jm1-pub-prod-v2
State: Running
Host: app-jm1-pub-prod-v2.azurewebsites.net
```

Non-secret settings:

| Setting | Readback |
| --- | --- |
| `JM1_STRIPE_MODE` | `live` |
| `JM1_STRIPE_CONNECT_ENABLED` | `true` |
| `JM1_STRIPE_COMMISSIONING_PAYMENT_ENABLED` | `false` |
| `DATAVERSE_ENVIRONMENT_URL` | `https://jm1hq.crm.dynamics.com` |
| `DATAVERSE_WEB_API_BASE_URL` | `https://jm1hq.crm.dynamics.com/api/data/v9.2` |

Secret-backed settings present:

- `STRIPE_CONNECT_SECRET_KEY`
- `STRIPE_CHECKOUT_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `DATAVERSE_CLIENT_SECRET`

Secret values were not printed or recorded.

## Webhook Gap

The current public Stripe webhook route is still scoped to commissioning payment events. It does not yet classify or write back Connect onboarding lifecycle events such as account updates, requirements due, details submitted, or payouts enabled for the full author royalty-payee population.

This blocks broad migration because Jackie should not have to manually open Stripe to know which authors completed onboarding.

