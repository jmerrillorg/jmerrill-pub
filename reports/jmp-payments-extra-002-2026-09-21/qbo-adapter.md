# QBO Adapter

Implementation: `BOUNDED_CONTRACT_COMPLETE`

Production commissioning: `BLOCKED`

The Publishing runtime uses an attributable enterprise adapter boundary limited to `customer_payment:create` and `customer_payment:read`. Any missing scope or any broader declared scope fails closed. The effect carries customer, receivable, gross amount, Stripe transaction, allocation fingerprint, and durable idempotency key. Independent readback must exactly match before reconciliation passes.

The enterprise evidence says current Stripe gross, fee, clearing, settlement, and refund behavior is not proven at transaction level. It also says no record-level Publishing QBO customer target is certified. No callable bounded QBO write service or credential is present in either repository. Therefore no production QBO write was attempted and `QBO_ADAPTER=NOT_COMMISSIONED`.
