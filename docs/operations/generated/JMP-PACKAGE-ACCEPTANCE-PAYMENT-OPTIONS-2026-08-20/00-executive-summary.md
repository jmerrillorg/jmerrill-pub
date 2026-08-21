# JMP Package Acceptance Payment Options Automation

Last verified: 2026-08-20

## Result

The package-acceptance path now connects the existing Publishing mailbox package-selection runtime to the canonical Author Offer Engine.

When a governed package acceptance is captured, the runtime can establish:

1. `PACKAGE_ACCEPTED`
2. `OFFER_PREVIEW_GENERATED`
3. `RESPONSE_PREVIEW`

The preview is non-send by design. It prepares the calculated payment-options response for founder/operator inspection and does not send automatically.

## Canonical Calculation Authority

PR #531 was reviewed, rebased, validated, and merged before this work.

- PR #531 URL: https://github.com/jmerrillorg/jmerrill-pub/pull/531
- PR #531 merge SHA: `361718f3548280ed1204154e610dafc639fc5e3f`
- Offer Engine file: `azure-functions/diagnostic-ai-runner/src/author/authorOfferEngine.js`
- Pricing rule version: `JMP_AUTHOR_LOYALTY_REFERRAL_v1.0`
- Payment fee policy version: `JMP_MULTIPAY_TRANSACTION_FEE_4_PERCENT_v1.0`

## Current PR Scope

- Package acceptance semantics.
- Offer Engine invocation after package acceptance.
- Referral-selection branching.
- Payment-options response preview.
- Pricing snapshot lifecycle helpers.
- Existing package-selection consumer integration.
- Focused tests and evidence.

## Negative Proof

| Flag | Value |
| --- | ---: |
| manual_payment_math_required | 0 |
| renderer_recalculates_offer | 0 |
| Stripe_recalculates_loyalty | 0 |
| Opportunity_recalculates_loyalty | 0 |
| referral_credit_auto_consumed | 0 |
| combined_benefit_above_50 | 0 |
| live_auto_send_before_commissioning | 0 |
| Atta_arrangement_changed | 0 |
| Joined_the_Family_triggered_by_package_acceptance | 0 |
| duplicate_package_acceptance | 0 |

## Validation

- Focused package/payment/consumer/engine tests: 101 / 101 PASS.
- Lint: PASS.
- Full Azure Functions suite: 1980 / 1983 PASS; 3 unrelated failures remain in `agreementGeneratedPackageMirror.test.js` synthetic DOCX mirror tests.
- Runtime deployment: NOT EXECUTED.
- Live author automatic sends: 0.
- Stripe writes: 0.
- Referral balance mutations: 0.
- Agreement regeneration: 0.

Node caveat: local validation ran under Node v26.0.0 while the Azure Functions package declares `>=22 <25`; no runtime version policy was changed in this PR.
