# Canonical Plan Registry

Single source of truth: `PLAN_CONFIGS` in `azure-functions/diagnostic-ai-runner/src/author/paymentPolicyEngine.js`.

| planCode | paymentCount | financedMonths |
|---|---:|---:|
| FULL_PAY | 1 | 0 |
| 2_PAY | 2 | 1 |
| 4_PAY | 4 | 3 |
| 8_PAY | 8 | 7 |
| 12_PAY | 12 | 11 |
| 18_PAY | 18 | 17 |
| 24_PAY | 24 | 23 |

Consumers (all derive from this registry, no independent copies remain):
- `authorOfferEngine.js` — re-exports `PLAN_CONFIGS`, calls `buildPaymentPlans` (no independent list)
- `agreementFieldComputer.js` — `PAYMENT_OPTION_INFO` maps author-facing option names to installment counts; `authorOfferPlanCode()` maps those to canonical `planCode`s (extended this pass; also fixed the pre-existing TWELVE_PAYMENTS mapping gap)
- `packageAcceptancePaymentOptions.js` / `packageAcceptanceCommunicationBuilder.js` — `PLAN_LABELS` display-name maps (extended this pass, both were missing 12/18/24)
- Stripe adapter (`lib/server/stripe/publishing-payment-event.ts`) and secure selection UI — fully generic, read `installmentCount` from the locked record; no hardcoded list existed here to begin with
