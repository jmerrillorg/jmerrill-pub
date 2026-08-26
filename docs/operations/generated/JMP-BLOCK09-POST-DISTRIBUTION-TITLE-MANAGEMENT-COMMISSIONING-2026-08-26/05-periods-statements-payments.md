# Royalty Periods, Statements, And Payments

Last Verified: 2026-08-26

## Royalty Period

Monthly period model:

OPEN -> SOURCE_DATA_RECEIVED -> RECONCILING -> CALCULATED -> QA_COMPLETE -> STATEMENT_ISSUED -> PAYMENT_PENDING -> PAID -> CLOSED.

## Clocks

- Statement due: within 10 business days after reporting month
- Payment due: 90 days after month-end, subject to executed title contract

## Statements

Statements consume:

- Title / edition
- Period
- Source-backed sales facts
- Royalty rule
- Royalty ledger
- Adjustments
- Payment status where appropriate

Statement templates do not calculate royalties.

## Payments

Payment lifecycle supports earned, payable, due, initiated, paid, failed, returned, held, and reissue states.

Payment failure does not eliminate royalty liability.

Real royalty payments and payment-related emails were not performed.
