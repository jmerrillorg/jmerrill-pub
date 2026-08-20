# Payment Plan Calculation

## Current Plans

- `FULL_PAY`
- `2_PAY`
- `4_PAY`
- `8_PAY`

## Fee Rule

Full Pay has no multi-pay transaction fee.

2-Pay, 4-Pay, and 8-Pay apply the current 4 percent fee to each installment principal after loyalty/referral reductions.

## Whole-Cent Allocation

The engine allocates adjusted principal to whole-cent installments and guarantees:

sum of installment principals = adjusted package principal.

Starter 8-Pay example:

- installments 1-7: $249.88 principal
- installment 8: $249.84 principal

## Fee Rounding

The 4 percent fee is rounded per transaction. The fee total is the sum of installment-level rounded fees.

## Tax

Tax remains external/governed. The engine returns `PENDING_EXTERNAL` and does not embed jurisdictional tax assumptions.

