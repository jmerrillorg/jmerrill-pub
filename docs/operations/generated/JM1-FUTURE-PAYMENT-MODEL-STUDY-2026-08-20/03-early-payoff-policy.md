# Early Payoff Policy Study

Date: 2026-08-20
Classification: STUDY / NOT APPROVED POLICY

## Candidate Policy

An author may pay off an approved payment plan early at any time. Early payoff carries no penalty. The payoff amount should include remaining unpaid principal plus only earned or accrued finance/plan charge, if the governing agreement uses such a charge. Future or unearned charges should not be collected after payoff.

## Current 4 Percent Model

Under the current 4 percent per-transaction model, the author avoids transaction fees associated with future unpaid transactions because those transactions do not occur. The payoff amount is the remaining unpaid principal, plus any already incurred fees/tax under the actual payment history.

## Future Simple Charge Model

Under the study's Model B, the total finance/plan charge would be known at agreement execution. If the author pays off early, only the earned portion is retained. The unearned future portion is waived.

Study assumption for examples:

- package: Starter, $1,999.00
- plan: 8-Pay
- future charge model: 6 percent annual simple charge over 7 financed months
- total future finance/plan charge: $69.97
- earned charge recognized pro rata by elapsed financed months
- tax excluded

## Starter 8-Pay Worked Example

| Point | Scheduled payments completed | Principal paid | Remaining principal | Current 4 percent fees already incurred | Current future fees avoided | Future Model B earned charge | Future Model B charge avoided | Future Model B payoff due before tax |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| After 1 payment | 1 | $249.88 | $1,749.12 | $10.00 | $69.99 | $0.00 | $69.97 | $1,749.12 |
| 25 percent of term | 2 | $499.76 | $1,499.24 | $20.00 | $59.99 | $10.00 | $59.97 | $1,509.24 |
| 50 percent of term | 4 | $999.52 | $999.48 | $40.00 | $39.99 | $29.99 | $39.98 | $1,029.47 |
| 75 percent of term | 6 | $1,499.28 | $499.72 | $60.00 | $19.99 | $49.98 | $19.99 | $549.70 |

## Governance Requirements Before Use

| Requirement | Classification |
|---|---|
| Define whether payoff charge is pro rata, daily accrued, monthly accrued, or another method | Policy |
| Update future agreement language | Legal/compliance |
| Add finance/plan-charge disclosure | Legal/compliance |
| Confirm tax treatment of principal versus fee/charge | Accounting |
| Confirm posting treatment for earned and unearned charge | Accounting |
| Build Stripe payoff/cancellation procedure | Operational |
| Add Dynamics payoff and release-gate fields/projections if not already available | Operational |
| Validate author-facing payoff statement wording | Legal/compliance |

## Recommendation

Do not use a future early-payoff finance model until the payoff formula is approved in writing and systems preserve original agreement version, plan schedule, earned charge, unearned charge, payoff amount, and release-gate status.
