# Payment Projection Design

Stripe remains PAYMENT TRANSACTION TRUTH. Stripe is not the accounting system. Business Central handoff belongs to Tranche 2. Tranche 1 defines payment status projection only.

| Scenario | Validation | Projection | Gate effect | Audit evidence |
| --- | --- | --- | --- | --- |
| checkout.session.completed / payment_intent.succeeded | Verify signature, expected reference, amount/currency, metadata, idempotency key. | Project payment status to Dataverse/D365 as PAYMENT_CONFIRMED only after validation. | Evaluate fulfillment gate. | Persist event id, payment intent, status, timestamp, amount, opportunity/agreement reference. |
| failed payment | Verify event and related opportunity/payment request. | Project PAYMENT_FAILED / PAYMENT_PENDING. | Do not authorize fulfillment. | Log failure evidence and next action. |
| partial payment | Compare payment plan/installment requirement to amount/status. | Project PARTIAL_PAYMENT / PAYMENT_PENDING. | Authorize only if payment plan says current installment is sufficient. | Log installment and remaining amount. |
| refund | Verify Stripe refund event. | Project REFUND_REVIEW / PAYMENT_EXCEPTION. | Re-evaluate hold/authorization; do not silently revoke without rule. | Log refund id and required Jackie review. |
| duplicate event | Idempotency key or Stripe event id already processed. | No-op same payload; conflict on divergent payload. | No duplicate authorization. | Log duplicate/no-op or conflict. |
| manual correction | Jackie-approved correction with evidence. | Project corrected status with reason/actor. | Re-evaluate gate. | Correction evidence and approver. |
| stale status | No confirming event by expected deadline. | Project STALE_PAYMENT_PENDING. | No authorization. | Age, source, owner, next reminder. |
