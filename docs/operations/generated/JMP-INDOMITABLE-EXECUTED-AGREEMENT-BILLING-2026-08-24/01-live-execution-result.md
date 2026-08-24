# Live Execution Result

Last Verified: 2026-08-24T12:53:28Z

## Production Release

| Field | Value |
|---|---|
| PR #597 merge | `712361de5ab19411ccb214356f9fa263850e0200` |
| PR #598 merge | `264977653d542c714dcbe7972e03d92f39511112` |
| Production `/api/health` | `ready` |
| Production release | `264977653d542c714dcbe7972e03d92f39511112` |

## Stripe

The production app route reached the billing continuation but the configured app Stripe secrets returned `more_permissions_required` for customer/invoice creation. The live payment request was completed through the already-authenticated Stripe CLI operator path using the same governed metadata and idempotency pattern.

| Field | Value |
|---|---|
| Duplicate customer preflight | `0` existing customers for `quanishadockery7777@gmail.com` |
| Stripe Customer | `cus_V8DlN4Jeu1jDBi` |
| Invoice item | `ii_1U7xKeJCiOVFpgYu92SiWrDY` |
| Invoice | `in_1U7xLRJCiOVFpgYu1SKo9kgC` |
| Invoice number | `QXKWX2LC-0001` |
| Amount due | `$209.06` |
| Amount paid | `$0.00` |
| Status | `open` |
| Live mode | `true` |
| Collection method | `send_invoice` |
| Auto advance | `false` |
| Payment URL | `CREATED / NOT STORED IN REPO` |

## Author Email

| Field | Value |
|---|---|
| Delivery status | `AUTHOR_RESPONSE_SENT` |
| Provider | `acs-email` |
| Subject | `Indomitable — First Payment Link` |
| From | `publishing@email.jmerrill.one` |
| To | `quanishadockery7777@gmail.com` |
| CC | `publishing@jmerrill.one` |
| Internal visibility mailbox | `publishing@jmerrill.one` |
| Archive copy received | `2026-08-24T12:52:48Z` |

## Dataverse Events

| Event | ID |
|---|---|
| `AGREEMENT_FULLY_EXECUTED` | `452ffd4d-b99f-f111-b8dc-00224820105b` |
| `STRIPE_CUSTOMER_READY` | `30d355ba-ba9f-f111-b8dc-6045bdd69678` |
| `BILLING_PLAN_CREATED` | `0dd6c5c8-ba9f-f111-b8dc-6045bdd69678` |
| `FIRST_PAYMENT_REQUESTED` | `13d6c5c8-ba9f-f111-b8dc-6045bdd69678` |

Opportunity readback:

| Field | Value |
|---|---|
| Opportunity | `455daa4a-629f-f111-b8dc-6045bdd69678` |
| Agreement preparation status | `AGREEMENT_SIGNED_ACTIVE` |
| Payment selection evidence log | `WAITING_ON_AUTHOR / FIRST_PAYMENT` |
| First-payment status | `null` |
| First-payment confirmed on | `null` |

## Negative Proof

| Control | Result |
|---|---|
| Agreement regenerated | `0` |
| Agreement resent for signature | `0` |
| Payment options resent | `0` |
| Automatic charge | `0` |
| Payment marked received without Stripe confirmation | `0` |
| Production started before first payment | `0` |
| Business Central posting | `0` |
| Duplicate first-payment email | `0` |
| Duplicate lifecycle event | `0` |

## Remaining Systemic Gap

The production application does not currently have a Stripe API secret with customer/invoice creation permissions. The runtime path is deployed and protected, but future app-native execution requires a governed Stripe billing secret with least-privilege permissions for:

- customer create/read for Publishing billing;
- invoice item create;
- invoice create/finalize/read;
- no charge/refund/payout authority beyond the existing payment-confirmation webhook path.
