# Preview and Lock Semantics

Last verified: 2026-08-21

## Canonical Flow

`PACKAGE_ACCEPTED -> OFFER_PREVIEW -> referral selection if needed -> payment-plan selection -> PRICING_LOCKED`

## Evidence

`buildOfferPreview` produces:

- `OFFER_PREVIEW_GENERATED`
- `PAYMENT_OPTION_SELECTION_PENDING` when no referral choice is needed
- `REFERRAL_SELECTION_PENDING` when referral credits are available and not yet selected
- `liveActions.sendsAuthorEmail = false`
- `liveActions.mutatesReferralBalance = false`
- `liveActions.createsStripePaymentLink = false`
- `liveActions.regeneratesAgreement = false`
- `liveActions.triggersJoinedTheFamily = false`

`lockPricingSnapshotFromPreview` produces `PRICING_LOCKED` only after a selected payment plan is provided.

Duplicate lock attempts with an existing locked snapshot are idempotent and do not recalculate the snapshot.

## Boundary

The author saying yes to a package does not lock pricing. Pricing locks only after referral choice is complete where applicable and payment option is selected.
