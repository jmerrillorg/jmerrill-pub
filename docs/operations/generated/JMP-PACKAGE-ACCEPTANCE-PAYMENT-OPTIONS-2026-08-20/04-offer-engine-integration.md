# Offer Engine Integration

Last verified: 2026-08-20

## Flow

```text
PACKAGE_ACCEPTED
→ Author Offer Engine
→ OFFER_PREVIEW_GENERATED
→ RESPONSE_PREVIEW
```

## Inputs

The integration accepts governed input fields only:

- package code;
- package catalog price;
- author/contact;
- title/project/intake;
- prior eligible JMP title count;
- referral-credit bank or available percent;
- selected referral credit percent, when supplied;
- active pricing rule version.

## Authority

The communication layer does not calculate price, loyalty, referral credits, payment schedules, or fees.

Authority remains:

`azure-functions/diagnostic-ai-runner/src/author/authorOfferEngine.js`

## States

| State | Meaning |
| --- | --- |
| OFFER_PREVIEW | Calculated preview exists; not contractual. |
| REFERRAL_SELECTION_PENDING | Referral credits exist and author must choose application amount. |
| PAYMENT_OPTION_SELECTION_PENDING | Payment options are available for author selection. |
| PRICING_LOCKED | Immutable title-specific commercial snapshot exists. |

## Production Boundary

This PR does not deploy the runtime and does not activate automatic author sends.
