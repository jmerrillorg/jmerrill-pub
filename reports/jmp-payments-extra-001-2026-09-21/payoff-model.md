# Payoff Model

Additional payments reduce the same remaining agreement balance. The normal installment amount remains unchanged until the final capped installment, while the remaining installment count is recalculated with ceiling division.

An exact payoff sets `paidInFull=true`, `recurringCadenceActive=false`, `nextScheduledInstallmentCents=0`, and `nextScheduledDueDate=null`.

The pure contract is complete. Live autopay cancellation cannot be certified because no recurring scheduler/subscription executor exists in the repository.

