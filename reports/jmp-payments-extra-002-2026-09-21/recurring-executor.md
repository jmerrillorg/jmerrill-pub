# Recurring Executor

Implementation: `PASS_IN_DETERMINISTIC_RUNTIME`

Production scheduler: `NOT_DEPLOYED`

`runRecurringInstallmentExecutor` finds due active agreements, chooses the oldest due obligation, caps the invoice at remaining balance, requires the existing Stripe customer, creates a deterministic execution key, and persists a collection attempt. A restart sees the same attempt and does not create another invoice. Paid-in-full and held agreements do not execute.

The executor creates collection objects only. Schedule advancement and balance reduction occur after verified Stripe success. Cody is not a recurring payment job.
