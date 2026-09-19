# Recovery Path Readback

The existing recovery endpoint remains protected by `JM1_PAYMENT_EVENT_RECOVERY_KEY` and re-reads the PaymentIntent from Stripe before processing.

The repair removes caller authority to override invoice, customer, subscription, or schedule identifiers. A genuine human correction may provide only an Opportunity GUID and must include both `confirmBinding: true` and a nonempty correction reason. The resulting provider-object binding is persisted as a hashed execution-log key. Later webhook or recovery retries can reuse that binding without asking Jackie to reconcile the same object again.

The recovery path creates no payment, invoice, refund, transfer, author communication, QBO mutation, or Business Central write.
