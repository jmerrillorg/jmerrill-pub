# Tests

- `test/paymentPolicyEngineExtendedFinancing.test.js` (new): 19/19 pass — Quanishia fixtures byte-exact for all 7 plans, financedMonths formula, exact-cent allocation (no drift), 6% formula validation, early payoff at multiple points in 12/18/24 terms, v1.0 backward-compatibility, invalid-term rejection (16/6/10-month).
- `test/agreementFieldComputer.test.js`: +3 new tests, 22/22 pass — TWELVE_PAYMENTS regression proof (asserts the fixed 6% total, NOT the old legacy-fallback 4% total), EIGHTEEN/TWENTY_FOUR_PAYMENTS resolve correctly, unsupported term rejected.
- `test/authorOfferEngine.test.js`, `test/packageAcceptancePaymentOptions.test.js`: updated 2 hardcoded plan-code-list assertions to include 12/18/24; 48/48 pass.
- Full suite: `node --test test/*.test.js` — **2020/2020 pass, 0 fail**, confirming zero regressions anywhere else in the function app (including the legacy 4%-fee path, Atta's grandfathered arrangement's test coverage, and every unrelated module touched by this session).
