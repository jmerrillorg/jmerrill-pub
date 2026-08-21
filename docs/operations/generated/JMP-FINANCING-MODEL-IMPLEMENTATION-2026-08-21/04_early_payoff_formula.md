# Early Payoff Formula

Last verified: 2026-08-21T00:00:00Z

## Canonical Rule

Early payoff is available at any time for financed plans.

Formula:

`remaining principal + earned payment-plan charge`

Unearned future payment-plan charge is waived. There is no early-payoff penalty.

## Runtime Fields

The payment policy engine returns:

- `earlyPayoff.available`
- `earlyPayoff.noPenalty`
- `earlyPayoff.unearnedFutureChargeWaived`
- `earlyPayoff.formula`

## Test Coverage

The author offer engine test verifies an 8-pay early-payoff scenario after four payments and confirms:

- remaining principal is computed separately;
- earned charge is computed separately;
- unearned future charge is waived;
- payoff amount excludes unearned future charge.

