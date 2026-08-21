# Early Payoff Formula

Last verified: 2026-08-21T18:49:27Z

## Canonical Rule

Early payoff is available at any time for financed plans.

Formula:

`remaining principal + earned payment-plan charge`

Unearned future payment-plan charge is waived. There is no early-payoff penalty.

## Charge-Earning Convention

The approved plan charge is earned linearly over the plan's financed months.

| Field | Convention |
|---|---|
| Time basis | Financed months |
| Full Pay | 0 financed months; no charge |
| 2-Pay | 1 financed month |
| 4-Pay | 3 financed months |
| 8-Pay | 7 financed months |
| Payoff date handling | If a plan start date and payoff date are supplied, elapsed whole UTC calendar months are used and capped at the governed financed-month term |
| Explicit elapsed-month handling | Runtime may receive `elapsedFinancedMonths` from a governed payment schedule/payoff event; the value is capped between 0 and the plan's financed-month term |
| Partial-month handling | Deterministic fractional elapsed months are supported when supplied by the governed payoff event; otherwise date-based calculation uses whole elapsed UTC calendar months |
| Rounding | Earned charge is rounded to the nearest cent after prorating the total plan charge |
| Earned charge | `total plan charge x elapsed financed months / total financed months` |
| Unearned charge | `total plan charge - earned charge`; waived/not due after payoff |

## Runtime Fields

The payment policy engine returns:

- `earlyPayoff.available`
- `earlyPayoff.noPenalty`
- `earlyPayoff.unearnedFutureChargeWaived`
- `earlyPayoff.formula`

## Test Coverage

The author offer engine tests verify 8-pay early-payoff scenarios immediately after the first scheduled payment, at 25% of term, at 50% of term, at 75% of term, and before the final scheduled payment. Each case confirms:

- remaining principal is computed separately;
- earned charge is computed separately;
- unearned future charge is waived;
- payoff amount excludes unearned future charge.
