# Indomitable Executed Agreement Billing Continuation

Last Verified: 2026-08-24

## Scope

This package records the bounded runtime repair for Quanisha Dockery / *Indomitable* after the agreement package was fully executed.

Authorized commercial facts:

| Field | Value |
|---|---|
| Opportunity | `455daa4a-629f-f111-b8dc-6045bdd69678` |
| Intake | `JMP-INT-202608-0AOS7L` |
| Author | Quanisha Dockery |
| Author email | `quanishadockery7777@gmail.com` |
| Package | Professional Publishing Package |
| Package SKU | `JMP-PKG-PRO` |
| Principal | `$4,500.00` |
| Payment option | `TWENTY_FOUR_PAYMENTS` |
| Payment policy | `JMP_FINANCING_EARLY_PAYOFF_v1.1` |
| Payments 1-23 | `$209.06` |
| Payment 24 | `$209.12` |
| Total before tax | `$5,017.50` |

## Root Cause

The prior governed payment-link runtime was intentionally link-only. It expressly did not create a Stripe Customer, invoice, subscription, author send, or first-payment request after a signed agreement. That left the executed-agreement-to-billing continuation unimplemented for this commercial state.

## Repair

Added a protected route and service:

- `app/api/author/billing/indomitable-first-payment/route.ts`
- `lib/server/stripe/publishing-first-payment-billing.ts`

The route requires the existing `JM1_PAYMENT_EVENT_RECOVERY_KEY` and explicit confirmations for:

- executed agreement;
- first-payment request creation;
- author email send.

## Controls

- No agreement regeneration.
- No agreement resend for signature.
- No payment-option resend.
- No automatic card charge.
- No payment marked received without Stripe confirmation.
- No production start before first payment.
- No Business Central posting.
- Canonical author email sender: `publishing@email.jmerrill.one`.
- Canonical Reply-To and CC: `publishing@jmerrill.one`.

## Validation

| Check | Result |
|---|---|
| Focused guard | `7 / 7 PASS` |
| Type-check | `PASS` |
| Production build | `PASS` |

The local build emitted the existing Dataverse catalog configuration warning because Dataverse secrets are not present during local static generation, but the production build completed successfully and registered the new dynamic route.

## Stripe Readback Caveat

The configured Stripe key returned `more_permissions_required` for both broad customer search and list-by-email preflight. The live continuation therefore relies on:

- Dataverse execution-log idempotency;
- deterministic Stripe idempotency keys;
- no duplicate author email when `FIRST_PAYMENT_REQUESTED` already exists.

This caveat must be preserved as evidence rather than reported as duplicate-search proof.
