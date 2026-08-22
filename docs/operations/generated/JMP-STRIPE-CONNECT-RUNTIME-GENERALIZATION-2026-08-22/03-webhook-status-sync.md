# Webhook Status Sync

Last verified: 2026-08-22T08:30:28Z

## Event Added

The Stripe webhook route now recognizes:

`account.updated`

This event synchronizes safe Connect readiness fields without creating payments, payouts, transfers, royalty payables, or Bill.com changes.

## Safe Status Fields

The status mapper records:

- Account exists.
- Onboarding started or pending.
- Details submitted.
- Requirements due.
- Charges enabled.
- Payouts enabled.
- Ready for royalties.

Readiness values:

- `ONBOARDING_STARTED_OR_PENDING`
- `ONBOARDING_SUBMITTED_REQUIREMENTS_PENDING`
- `READY_FOR_ROYALTIES`

## Contact Link Requirement

Webhook status sync requires exactly one active Contact linked to the Stripe account ID. Missing or ambiguous Contact linkage fails closed.

## Execution Logging

Webhook sync writes a safe execution-log event:

`STRIPE_CONNECT_STATUS_SYNCHRONIZED`

The source entity is `stripe_account`, and the source record is the Stripe account ID. The log description explicitly records that no payout, transfer, Business Central posting, royalty calculation, or Bill.com change occurred.

