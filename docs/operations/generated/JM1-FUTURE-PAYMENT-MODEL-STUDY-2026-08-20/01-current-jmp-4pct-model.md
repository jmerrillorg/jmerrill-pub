# Current JMP Publishing 4 Percent Multi-Pay Model

Date: 2026-08-20
Classification: STUDY / CURRENT-STATE DESCRIPTION

## Current Payment Options

The current JMP Publishing structure supports:

- Full Pay
- 2-Pay
- 4-Pay
- 8-Pay

For multi-pay structures, the package principal remains the package price. A 4 percent transaction fee is applied to each multi-pay transaction. Applicable tax is separate and is not included in the examples in this study.

## Current Package Prices Used

| Package | Cash package principal |
|---|---:|
| Starter | $1,999.00 |
| Professional | $4,500.00 |
| Premier/Signature | $7,500.00 |

## Whole-Cent Allocation Rule

The package principal is allocated across the selected number of payments in whole cents. When the package price does not divide evenly into the number of installments, the earlier scheduled installments use the rounded whole-cent amount and the final installment carries the remainder so total principal equals the approved package price exactly.

Example:

Starter 8-Pay principal allocation:

`$249.88 + $249.88 + $249.88 + $249.88 + $249.88 + $249.88 + $249.88 + $249.84 = $1,999.00`

## Transaction Fee Treatment

The 4 percent fee is charged on each multi-pay transaction when the payment transaction occurs. It is not principal. It is not part of the package cash price. Applicable tax remains separate.

Example:

Starter 8-Pay:

- first seven principal installments: $249.88
- final principal installment: $249.84
- 4 percent fee on $249.88: $10.00
- 4 percent fee on $249.84: $9.99
- total transaction fees: $79.99
- total before tax if all payments run: $2,078.99

## Operational Rule

Work may continue while an approved payment plan is active. Final delivery/release remains payment-gated. This means the author may progress through publishing work during the plan, but governed final release or deliverable handoff must respect the contractual payment obligation.

## Existing Contract Treatment

Existing executed agreements should continue under the terms that were executed. The future payment model study must not silently alter existing author obligations, payment schedules, transaction fees, or release gates.

## Strengths

- Operationally simple.
- Already used in existing Publishing agreements.
- Easy to compute at transaction time.
- Stripe-friendly for fixed schedules.
- Future fees are avoided if future transactions do not occur.

## Weaknesses

- The same 4 percent fee applies to 2-Pay and 4-Pay in the modeled examples because it is assessed against the same total principal across multiple transactions.
- Authors may not intuitively understand why a shorter 2-Pay and longer 4-Pay produce the same total transaction-fee amount.
- The fee is processor/transaction framed, not a clear financing price.
- It does not naturally express earned versus unearned charges for early payoff beyond the fact that future transaction fees have not yet occurred.

## Current-State Boundary

This file describes the current model for study purposes only. It does not change prices, contracts, payment links, Stripe schedules, author communications, or release gates.
