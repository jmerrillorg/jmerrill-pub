# Existing Commercial Architecture

## Components Found

- `milestone6BusinessSourceLayer.js`: package catalog, Stripe package mappings, payment options, and Milestone 6 readiness.
- `milestone6AuthorChoicePath.js`: package-selection branch model and payment-option preview data.
- `milestone6ContinuationCommunicationBuilder.js`: pure author email draft builder for payment options.
- `agreementFieldComputer.js`: agreement package/payment fields with duplicated package price and payment schedule logic.
- `agreementPaymentLinkMapping.js`: Stripe payment-link amount mapping with embedded fee-inclusive installment logic.
- `agreementPreparationRunner.js`: agreement/addendum/Schedule A preparation.
- `milestone6PaymentOptionCaptureWriter.js`: controlled Opportunity payment-option capture.

## Existing Automation Recovery

Prior payment-option automation exists, but it was partial and fragmented. It could prepare package/payment-option data after package selection, but price/fee logic was duplicated in multiple modules and did not include returning-author or referral-credit benefit calculation.

## Why Manual Calculation Persisted

Jackie still had to calculate manually because the existing path did not have one canonical offer authority for loyalty, referral bank selection, 50 percent cap enforcement, adjusted principal, per-installment fee schedules, and immutable pricing snapshot inputs.

## Correction in This PR

`authorOfferEngine.js` becomes the canonical pure calculation authority for the first implementation pass. Existing downstream modules are not yet live-switched, except for a safe adapter added to `agreementPaymentLinkMapping.js` so downstream payment-link logic can consume canonical offer schedules.

