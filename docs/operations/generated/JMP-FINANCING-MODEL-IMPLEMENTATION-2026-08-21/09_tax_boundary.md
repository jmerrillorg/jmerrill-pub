# Tax Boundary

Last verified: 2026-08-21T00:00:00Z

## Classification

`PENDING_EXTERNAL`

## Rule

The offer engine and payment policy engine do not guess tax. Tax remains external/pending until the governed tax calculation path applies.

## Runtime Behavior

Payment-plan amounts are calculated before tax. Installment rows preserve tax fields as external/null rather than inventing a tax amount.

