# Stripe Runtime

Implementation: `PASS_BEHIND_CLOSED_GATE`

The adapter creates an invoice item and invoice for the existing customer with a stable idempotency key and governed metadata. Additional payments are bounded by current payoff balance and balance version. Combined current-plus-additional payments preserve separate logical allocations in the durable event.

The adapter requires a live credential and every commissioning flag before it can instantiate. Invoice creation has no balance effect. Only a verified success event may enter the confirmed-payment path. The existing webhook remains fail-closed for typed agreement payments until the ledger and QBO layers are commissioned.
