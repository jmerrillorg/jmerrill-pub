# Current Payment Architecture

`CURRENT_INSTALLMENT_MODEL = frozen payment-election fields on Opportunity plus one-off Stripe invoice creation for the first payment; no repository-owned recurring installment executor was found.`

`CURRENT_BALANCE_AUTHORITY = JM1 Opportunity selected-payment total is the frozen commercial total; no durable remaining-balance ledger is commissioned.`

`CURRENT_STRIPE_PAYMENT_OBJECTS = Stripe Customer, Invoice Item, Invoice, hosted invoice, PaymentIntent/Charge readback, and verified webhook events.`

`CURRENT_QBO_RECONCILIATION_MODEL = QBO is documented as current accounting authority during Movement 4, but no QBO posting or reconciliation adapter exists in this repository.`

`CURRENT_FINAL_INSTALLMENT_LOGIC = frozen schedule math exists; live recurring invoice generation and dynamic final-installment capping do not.`

`CURRENT_EXTRA_PAYMENT_SUPPORT = none before this package; the new domain contract is implemented but runtime initiation and durable application remain held.`

`CURRENT_PAYOFF_DETECTION = early-payoff calculation exists in the policy engine; no live payoff consumer stops billing.`

`CURRENT_AUTOPAY_STOP_LOGIC = none found.`

Canonical inspected paths: `publishing-first-payment-billing.ts`, `publishing-payment-event.ts`, `author-workspace-webhook.ts`, `paymentPolicyEngine.js`, and the JMP-PAY-INGEST-001 evidence package.

