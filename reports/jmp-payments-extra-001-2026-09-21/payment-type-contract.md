# Payment Type Contract

The canonical types are `SCHEDULED_INSTALLMENT` and `ADDITIONAL_PAYMENT`.

The contract requires stable author, agreement, title, and payment-schedule IDs; integer cents; USD; a preflight balance version; balance before/after; and a scheduled-obligation ID for scheduled payments. Email is never identity authority.

Additional payments reduce the remaining agreement balance but do not satisfy or move the next scheduled obligation. A same-session payment may carry multiple logical allocations, but each allocation retains its type.

Typed events are recognized at the verified Stripe webhook boundary and fail closed until the durable runtime is commissioned.

