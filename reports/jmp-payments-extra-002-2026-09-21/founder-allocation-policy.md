# Founder Allocation Policy

Status: `RATIFIED_AND_IMPLEMENTED`

Allocation order is deterministic:

1. Oldest past-due scheduled obligation.
2. Next past-due obligation until delinquency is cured.
3. Current scheduled obligation only when the payment intent includes current due.
4. Remaining amount is additional payment.
5. Future obligations remain scheduled unless the agreement is paid in full.

An additional-payment intent cannot bypass delinquency. On a current account it reduces the agreement balance and does not replace the next scheduled installment. The four founder cases and oldest-first ordering pass in `scripts/jmp_payments_extra_002.test.mjs`.
