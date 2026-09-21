# Balance Authority

`ORIGINAL_AGREEMENT_AMOUNT = IMMUTABLE`

`PAYMENTS_APPLIED = DERIVABLE_FROM_APPEND_ONLY_EVENTS`

`REMAINING_BALANCE = ORIGINAL_AMOUNT - CONFIRMED_GROSS_PAYMENTS + CONFIRMED_REFUNDS`

Stripe fees never reduce the agreement-balance effect. Balance versions hash immutable agreement economics, scheduled obligations, payment facts, and refund facts. Event-order rebuild produces the same balance and version. ETag mismatch rejects concurrent mutation. No arbitrary staff balance-edit operation exists.
