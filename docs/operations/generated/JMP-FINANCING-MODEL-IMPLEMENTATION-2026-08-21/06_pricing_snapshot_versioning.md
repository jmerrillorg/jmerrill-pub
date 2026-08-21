# Pricing Snapshot Versioning

Last verified: 2026-08-21T00:00:00Z

## Versioned Snapshot Fields

The author offer snapshot now preserves:

- `pricingRuleVersion`
- `relationshipPricingRuleVersion`
- `paymentPolicyVersion`
- `paymentFeePolicyVersion`
- selected payment plan code and schedule fields

## Reason

Executed agreements and issued payment options must remain tied to the policy version used at issuance. Future template or pricing revisions must not silently rewrite prior offers.

## Validation

Agreement field computation test confirms the agreement layer consumes an immutable pricing snapshot using `JMP_FINANCING_EARLY_PAYOFF_v1.0` and carries the plan charge and early-payoff fields forward.

