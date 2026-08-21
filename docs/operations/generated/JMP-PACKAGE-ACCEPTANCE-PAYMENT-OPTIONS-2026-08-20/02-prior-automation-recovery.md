# Prior Automation Recovery

Last verified: 2026-08-20

## Search Result

Prior package-selection/payment-option functionality exists.

Classification:

`PARTIALLY_REPLACED`

## Evidence

| Component | Evidence | Finding |
| --- | --- | --- |
| Package selection response consumer | `azure-functions/diagnostic-ai-runner/src/orchestration/authorReviewResponseConsumer.js` | Existing five-minute inbound consumer monitors `publishing@jmerrill.one` and processes package-selection replies. |
| Package selection classifier | `azure-functions/diagnostic-ai-runner/src/mail/publishingPackageReplyClassifier.js` | Existing classifier detects Starter, Professional, and Premier package replies. |
| Package-selected event | `authorReviewResponseConsumer.js` | Existing runtime writes `PACKAGE_SELECTED` with idempotency. |
| Milestone 6 author choice path | `azure-functions/diagnostic-ai-runner/src/author/milestone6AuthorChoicePath.js` | Existing path prepares package/payment option payloads after selection. |
| Legacy payment-option math | `milestone6AuthorChoicePath.js` | Existing builder divided package cost and estimated fees locally. |
| Payment-option capture | `azure-functions/diagnostic-ai-runner/src/author/milestone6PaymentOptionCaptureWriter.js` | Existing gated writer captures chosen payment option. |
| Stripe mapping | `azure-functions/diagnostic-ai-runner/src/payment/agreementPaymentLinkMapping.js` | Now includes Author Offer Engine-backed adapter from PR #531. |

## Why Jackie Was Still Doing Manual Math

The old path could capture package selection and prepare basic payment options, but it did not have one canonical calculation authority for:

- returning-author loyalty;
- referral credit selection;
- the 50% combined cap;
- adjusted package principal;
- per-installment principal and fee schedules;
- immutable pricing snapshots.

Therefore, manual arithmetic was still required whenever an author had loyalty/referral considerations or when the exact payment-plan presentation had to match the future contract/payment path.

## Reuse Decision

Safe to reuse:

- mailbox capture;
- idempotency key discipline;
- package-selection correlation;
- `publishing@jmerrill.one` Microsoft-first path;
- payment-option capture boundary.

Superseded:

- local payment-option arithmetic in `milestone6AuthorChoicePath.js` for loyalty/referral-aware offers.

New authority:

- `authorOfferEngine.js` from PR #531.
