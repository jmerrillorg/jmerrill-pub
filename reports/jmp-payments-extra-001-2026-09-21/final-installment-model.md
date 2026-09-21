# Final Installment Model

`nextScheduledInstallment = min(normalInstallment, remainingBalance)`

For a normal installment of `$259.88` and remaining balance of `$220.36`, the next and final installment is `$220.36`. An attempted `$259.88` allocation is rejected with `$220.36` as the permissible maximum.

At zero balance, installment count becomes zero, the next due date is cleared, and recurring cadence is inactive.

