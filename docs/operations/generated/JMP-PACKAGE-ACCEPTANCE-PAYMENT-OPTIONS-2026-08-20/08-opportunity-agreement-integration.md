# Opportunity and Agreement Integration

Last verified: 2026-08-20

## Opportunity Projection

After acceptance:

```text
Waiting on Package Selection
→ PACKAGE_SELECTED
→ OFFER_PREVIEW_GENERATED
```

After payment selection:

```text
PAYMENT_OPTION_SELECTED
→ PRICING_LOCKED
```

The projection records state only. It does not recalculate pricing.

## Agreement Boundary

Agreement generation must consume the locked pricing snapshot when authorized.

This PR does not:

- regenerate agreements;
- send agreements;
- request signatures;
- modify executed agreements.

## Stripe Boundary

Stripe may consume the Author Offer Engine-backed schedule through the existing adapter.

This PR does not:

- create payment links;
- create checkout sessions;
- mutate Stripe;
- charge an author.

## Business Central Boundary

Business Central remains a later downstream consumer. No Business Central posting occurs in this PR.
