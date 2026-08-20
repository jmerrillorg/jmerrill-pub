# Pricing Snapshot Lifecycle

Last verified: 2026-08-20

## Preview

Offer previews may change while:

- referral credits are being selected;
- payment plan is not yet selected;
- governed source inputs remain unsettled.

State:

`OFFER_PREVIEW`

## Lock Point

Pricing locks only after:

1. package acceptance;
2. referral-credit application decision, if applicable;
3. payment-plan selection.

State:

`PRICING_LOCKED`

## Immutable Fields

The locked snapshot preserves:

- author;
- title/project;
- package;
- base package price;
- prior eligible-title count;
- loyalty percentage;
- referral available;
- referral applied;
- referral remaining;
- combined benefit;
- cap applied;
- adjusted principal;
- payment option;
- installment principal schedule;
- 4% fee schedule;
- tax status;
- pricing rule version;
- decision timestamps.

## Idempotency

Duplicate lock attempts with an existing `PRICING_LOCKED` snapshot return the existing snapshot instead of replacing it.
