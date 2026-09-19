# Future Financing Model Study

Date: 2026-08-20
Classification: STUDY / NOT APPROVED FOR USE

## Purpose

This file models a possible future payment structure for Publishing contracts. It is not approved. It must not be applied to existing contracts or active author payment arrangements.

## Design Principles

A future model should make the author-facing economics clearer:

- package has a clear cash price;
- installment plan has a defined finance charge, plan charge, or rate;
- payments are scheduled over the selected term;
- author may pay off early at any time;
- no early-payoff penalty;
- future or unearned finance charges are not collected after payoff;
- payoff amount reflects remaining principal plus only earned/accrued finance charge as applicable;
- tax treatment is reviewed separately.

## Models Compared

### Model A - Current 4 Percent Per-Transaction Fee

The existing Publishing model keeps package principal separate and charges 4 percent on each multi-pay transaction.

Use case:

- existing contracts;
- near-term operational continuity;
- plans where simplicity matters more than finance-charge precision.

### Model B - Simple Finance/Plan Charge

Study assumption: 6 percent annual simple charge, prorated by plan length.

Formula used in examples:

`cash price * 6 percent * remaining plan months / 12`

Assumed plan lengths:

- Full Pay: 0 financed months
- 2-Pay: 1 financed month
- 4-Pay: 3 financed months
- 8-Pay: 7 financed months

Early payoff concept:

- remaining principal is due;
- earned charge is retained;
- unearned future charge is waived;
- no penalty is added.

This is the preferred future study model because it is easier to explain than amortized or compound interest while still making the cost of longer payment plans explicit.

### Model C - Declining-Balance Installment Financing

Study assumption: 6 percent annual charge, accrued monthly on unpaid principal after each scheduled payment.

This model more closely aligns charge accrual to actual outstanding principal. It is more precise than Model B, but it requires stronger tracking of remaining principal, accrued charge, payoff date, and earned versus unearned charge.

### Model D - Compound-Interest Installment Financing

Study assumption: 6 percent APR compounded monthly using an amortization formula.

This model is included for comparison only. It should not be the Publishing default unless legal, accounting, and operational review determine that a true financing product is appropriate.

## Comparative Assessment

| Dimension | Model A Current 4 Percent | Model B Simple Charge | Model C Declining Balance | Model D Compound Interest |
|---|---|---|---|---|
| Customer total cost | Flat 4 percent of paid multi-pay principal, subject to rounding | Lower on short plans and term-sensitive | Usually lower than Model B because charge follows outstanding balance | Varies by amortization; can be harder to explain |
| Ease of explanation | Simple, but 2-Pay and 4-Pay may look oddly equal | Strong: cash price plus stated plan charge | Moderate | Weakest |
| Early payoff | Avoids future transaction fees | Waives unearned charge | Collects accrued charge only | Requires amortized payoff calculation |
| Stripe implementation | Strong with finite schedules | Good with schedules plus payoff/cancel path | More custom payoff math | Most custom |
| Dynamics impact | Already close to current projection | Needs principal/charge separation | Needs accrual tracking | Needs amortization tracking |
| Business Central impact | Transaction fees can post as fee revenue or expense offset per accounting policy | Requires finance/plan-charge posting policy | Requires earned/accrued charge policy | Requires interest/finance accounting policy |
| Agreement/disclosure | Existing agreement path | New contract and payoff disclosure | Stronger finance disclosure | Strongest finance disclosure |
| Operational complexity | Low | Moderate | Moderate-high | High |
| Author experience | Familiar but less transparent by term | Clearest future author explanation | More accurate but more technical | Most finance-like |
| Accounting clarity | Clear transaction amount, less clear plan economics | Clear separation if designed well | Clear but requires accrual discipline | Requires finance-led accounting treatment |
| Compliance risk | Existing reviewed path for current contracts | Requires legal/compliance review | Requires legal/compliance review | Highest review burden |

## Preferred Future Direction

For future contracts, Model B is the best candidate for Publishing if counsel and accounting approve. It is simple enough for authors to understand while supporting early payoff and avoiding silent collection of future unearned charges.

Model C may be appropriate if JM1 wants more precise accrual logic. Model D should remain comparison-only unless JM1 intentionally chooses a formal consumer-financing posture.
