# Required Stripe Operations

Last Verified: 2026-08-24T20:18:42Z

## App-Native Billing Creation

Source: `lib/server/stripe/publishing-first-payment-billing.ts`

| Operation | Stripe API | Required permission |
| --- | --- | --- |
| Create/read billing customer | `POST /v1/customers`, `GET /v1/customers/{id}` | Customers: Write and Read |
| Create invoice line | `POST /v1/invoiceitems` | Invoice Items: Write |
| Create invoice | `POST /v1/invoices` | Invoices: Write |
| Finalize invoice | `POST /v1/invoices/{id}/finalize` | Invoices: Write |
| Retrieve hosted invoice/payment status | `GET /v1/invoices/{id}` | Invoices: Read |

The route uses idempotency keys derived from the governed opportunity and action name.

## Payment Success Recovery

Source: `lib/server/stripe/publishing-payment-event.ts`

| Operation | Stripe API | Required permission |
| --- | --- | --- |
| Manual payment recovery readback | `GET /v1/payment_intents/{id}?expand[]=latest_charge` | PaymentIntents: Read and Charges: Read |

Webhook processing consumes safe event fields and does not create billing objects.

## Least-Privilege Boundary

The billing key does not require:

- payouts;
- transfers;
- Connect onboarding mutation;
- refunds;
- disputes;
- product or price creation;
- subscription schedule creation for the current invoice-first path;
- Business Central access.
