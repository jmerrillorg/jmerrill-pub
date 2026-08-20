# Practical Recommendation

Date: 2026-08-20
Classification: STUDY / DECISION SUPPORT

## Near Term

Keep using the current 4 percent per-transaction model for existing executed Publishing contracts and active payment arrangements. Do not modify, regenerate, or reinterpret existing contracts. Do not change active Stripe schedules as part of this study.

## Future Contracts

Preferred future direction:

- retain cash package price as the anchor;
- treat Full Pay as cash price only;
- consider 2-Pay as either no-charge or low-charge for author simplicity;
- move 4-Pay and 8-Pay toward a disclosed plan/finance charge if counsel and accounting approve;
- include early payoff with no penalty;
- waive unearned future charges after payoff;
- preserve the executed agreement version and payment schedule permanently.

The best future candidate is Model B: simple finance/plan charge. It is more transparent than the current transaction-fee framing and less complex than amortized or compound-interest models.

## Financial

J Merrill Financial should not adopt the Publishing model automatically. It may separately study a similar structure for JMF-owned advisory/service fees only. It must not apply the model to insurance premiums, pre-need carrier payments, FDLIC arrangements, Precoa arrangements, carrier-controlled payment schedules, or regulated third-party products without separate authority.

## Systems Required

Future implementation would require:

- agreement/addendum updates;
- author-facing payment-plan disclosure;
- Stripe schedule and payoff/cancellation logic;
- Dynamics projection of principal, charge, tax, payment state, balance, payoff, and release gate;
- Business Central posting design for principal, fees/charges, tax, refunds, payoff, and waived charge;
- evidence logging for plan selection, execution version, payment events, payoff, and release clearance;
- test coverage for Full Pay, 2-Pay, 4-Pay, 8-Pay, early payoff, failed payment, cancellation, and final release blocking.

## Governance Required

Required approvals before rollout:

| Approval | Reason |
|---|---|
| Founder policy decision | Choose future payment model and which plans it applies to |
| Counsel review | Contract/disclosure/consumer-credit review |
| Accounting review | Revenue, fee, tax, payoff, and waived-charge treatment |
| Systems architecture approval | Stripe/Dynamics/Business Central implementation path |
| Commercial catalog update | If pricing, fees, or plan charges become productized |
| Agreement template update | Future contracts only |
| Author-facing communication approval | Ensure plain-language explanation |

## Recommended Founder Decision Sequence

1. Preserve current model for existing contracts.
2. Decide whether future 2-Pay remains fee-based, becomes no-charge, or uses a small plan charge.
3. Decide whether 4-Pay and 8-Pay should use a finance/plan charge.
4. Select the payoff calculation method for future plans.
5. Send the selected model to counsel/accounting before any implementation.
6. Build systems only after agreement language and accounting treatment are settled.

## Do Not Do Yet

- Do not change Atta's existing 4 percent multi-pay contract.
- Do not alter Stripe schedules.
- Do not change live package pricing.
- Do not issue updated author agreements.
- Do not apply this model to JMF regulated or third-party products.
- Do not start implementation before approvals.
