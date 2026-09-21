# Stripe Implementation

The safest repository-aligned mechanism is a one-time Stripe Invoice against the existing author Customer. It matches the current first-payment architecture, produces receipts, supports metadata, and converges through the existing verified webhook.

Required metadata is implemented in `publishing-agreement-payment.ts`. The verified webhook propagates it to the consumer boundary. No parallel Stripe Customer is permitted.

Creation of additional-payment invoices is intentionally not enabled because the repository lacks a durable balance reservation/ledger and current-customer lookup contract for every agreement. Typed events fail closed rather than falling through to initial-payment handling.

