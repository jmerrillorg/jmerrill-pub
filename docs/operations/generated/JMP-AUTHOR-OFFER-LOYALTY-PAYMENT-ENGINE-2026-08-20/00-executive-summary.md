# JMP Author Offer / Loyalty / Payment Engine - 2026-08-20

## Classification

IMPLEMENTED / TESTED / NOT ACTIVATED FOR LIVE AUTHOR SENDS

## Result

This pass adds one canonical pure calculation authority for author offer math:

- package base price from existing governed Milestone 6 package catalog;
- automatic returning-author benefit;
- earned/available/applied referral benefit;
- 50 percent combined cap;
- adjusted package principal;
- Full Pay / 2-Pay / 4-Pay / 8-Pay schedules;
- per-installment 4 percent multi-pay fee;
- exact whole-cent principal allocation;
- tax boundary as external/pending;
- pricing snapshot structure.

No live author, Stripe, Dataverse schema, Business Central, or author-communication mutation occurred.

## Code

- `azure-functions/diagnostic-ai-runner/src/author/authorOfferEngine.js`
- `azure-functions/diagnostic-ai-runner/src/payment/agreementPaymentLinkMapping.js`

## Tests

- `azure-functions/diagnostic-ai-runner/test/authorOfferEngine.test.js`
- `azure-functions/diagnostic-ai-runner/test/agreementPaymentLinkMapping.test.js`

Validation:

- `npm ci`: PASS with existing Node 26 engine warning.
- `npm run lint`: PASS.
- Focused tests: PASS, 74 / 74.

## Boundaries

- Live author sends: 0.
- Live Stripe writes: 0.
- Live Dataverse schema mutations: 0.
- Live author-record remediation: 0.
- Live payment-plan changes: 0.
- Atta arrangement mutation: 0.

