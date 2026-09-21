# QBO Reconciliation

QBO is retained as current accounting authority. The expected mapping is gross payment against the same author receivable/agreement, Stripe fees to processor-fee expense/clearing, and net settlement to the settlement account.

`QBO_DUPLICATE_PAYMENT_RECORDS = NOT TESTABLE`

`QBO_RECONCILIATION_VARIANCE = NOT TESTABLE`

No QBO adapter, credentialed runtime, payment-posting contract, or readback path exists in this repository. No QBO write was attempted. Production commissioning remains blocked until that adapter can idempotently consume the same Stripe payment identity and return a durable reconciliation state.

