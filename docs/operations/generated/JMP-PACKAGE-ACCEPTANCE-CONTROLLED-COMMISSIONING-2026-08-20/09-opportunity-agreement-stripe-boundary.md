# Opportunity, Agreement, and Stripe Boundary

Last verified: 2026-08-21

## Opportunity Projection

Offer preview projects commercial state without recalculating money:

- `jm1_m6packageselectionstatus = PACKAGE_SELECTED`
- `jm1_m6paymentoptionpreparationstatus = OFFER_PREVIEW_GENERATED` or `REFERRAL_SELECTION_PENDING`
- `jm1_m6paymentoptionselectionstatus = PAYMENT_OPTION_SELECTION_PENDING`
- `jm1_pricingstate = <current pricing state>`

After pricing lock, `jm1_m6paymentoptionselectionstatus` is projected as `PAYMENT_OPTION_SELECTED`.

## Agreement / Addendum Boundary

Package acceptance does not regenerate an agreement or package addendum.

The immutable `PRICING_LOCKED` snapshot declares downstream authority for:

- Dynamics Opportunity
- Agreement / Title Addendum
- Stripe arrangement
- Author Workspace
- Publisher Operating Center
- Business Central when integrated

Generated agreement/addendum work remains downstream consumption of the locked pricing snapshot, not a trigger at initial package yes.

## Stripe Boundary

`computeInstallmentStripeAmountFromAuthorOffer` consumes the canonical Author Offer Engine output.

Synthetic adjusted Professional 8-Pay case:

- Source: `AUTHOR_OFFER_ENGINE`
- Pricing rule: `JMP_AUTHOR_LOYALTY_REFERRAL_v1.0`
- Package: `JMP-PKG-PRO`
- Plan: `8_PAY`
- Adjusted principal cents: `292500`
- Schedule principal sum: `292500`
- Total cents: `304203`

No Stripe customer, charge, invoice, subscription, or payment link was created during synthetic commissioning.
