# Fulfillment Authorization Gate

Publishing must not begin merely because an inquiry was accepted, an agreement exists, or a payment link was created.

## Standard Rule

Agreement valid
+
Required payment state satisfied
+
Publishing Track / Package valid
+
Required intake/onboarding fields complete
=
FULFILLMENT_AUTHORIZED

## Evidence Required

- Agreement template/version and executed or approved status.
- Publishing track, package, elected Product Forms, pricing, and SOW/special terms where applicable.
- Stripe payment confirmation or approved alternate payment evidence.
- Intake/onboarding fields required for the selected track/package.
- Jackie approval for exceptions, overrides, special terms, manual correction, or hold release.

## Explicit Non-Authorization

FULFILLMENT_AUTHORIZED is not created by an accepted inquiry, generated agreement, sent payment link, unsigned agreement, partial payment unless allowed by payment plan, or stale/manual note without evidence.
