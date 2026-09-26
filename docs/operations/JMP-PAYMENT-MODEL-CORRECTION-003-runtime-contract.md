# Persistent Publishing Payment Service

Packet: JMP-PAYMENT-MODEL-CORRECTION-003

The existing `run-publishing-inbound-service` minute timer owns settlement
reconciliation and observed-request projection. The web financial runtime owns
provider reads, exact contractual correlation, immutable payment evidence,
integer-cent recomputation, and existing-obligation Checkout access. The existing
inbound service outbox owns author communication and verified shared-mailbox copies.

## Admission and Boundaries

- Both financial service handlers and the consumer fail closed unless
  `JM1_OBSERVED_PAYMENT_SERVICE_ENABLED=true`.
- Runtime-to-web authority reuses the existing machine recovery credential via
  its Key Vault reference; no human login credential is used.
- Observed original requests explicitly retain unavailable native message IDs as
  null. Intake persists source text, founder authority, canonical identities,
  requested amount, and separately ratified historical settlement classification.
- Capture cannot supply an author response, payment URL, provider result, or send
  approval. Only the persistent runtime can prepare the account-service response.
- A historical settlement is not proof that a later request has been fulfilled.
- No invoice, independent obligation, schedule shift, editorial transition, or
  QBO write is part of this capability. QBO remains queued asynchronously.

## Recovery

The immutable Dataverse request is projected into the existing Blob queue under
its stable request ID. A route lease protects projection. Failed provider or
Dataverse work records a pending status, retry count, first-pending timestamp,
next retry, and failure code. Each normal timer cycle resumes outstanding work.

Payment persistence uses the existing atomic ETag changeset and unique payment
idempotency key. Replays verify existing identity, amount, and classification.
Preparation-only Checkout tails are recovered by exact provider client reference
and metadata, not by latest-record selection or recreation after key expiry.
Completed Checkout sessions are correlated and reconciled through the same ledger.

Communication uses the existing semantic outbox. Known accepted sends resume
audit/readback without another send. Ambiguous provider outcomes remain visible
and cannot silently trigger duplicates. Preview cannot create payment access.

## Supervision and Rollback

Authenticated `publishing/payment-service/health` exposes durable request/tail
results, pending count, oldest pending timestamp, retry count, latest successful
reconciliation, and latest failure. It is read-only.

Rollback disables only `JM1_OBSERVED_PAYMENT_SERVICE_ENABLED` in web and Function
configuration. Existing inbound author service remains enabled. Preserve all
payment events, provider objects, requests, outbox records, and evidence. Do not
roll back a settled financial fact.

Deployment, live parity, actual author delivery, and second-cycle idempotency must
be evidenced separately. Source tests alone do not commission this runtime.
# Relay Contract and Rejected-Response Recovery

Observed payment service uses the exact engagement GUID as its private relay
reference. Only the four certified payment-service templates accept this
reference form; legacy intake-template validation is unchanged.

A rejected observed-request delivery may replay only through the existing
ACS relay with durable semantic idempotency, under the business-route lease.
It must reuse the original canonical outbox reservation ID. Unknown ambiguity,
a different reservation, an accepted provider ID, or an injected/non-durable
sender does not qualify. The relay returns an accepted receipt on replay or
holds its ambiguous reservation; it does not blindly send twice.

Legacy rejected records retain the original relay identity during recovery.
New observed requests carry the author ID, request ID/workstream, and exact
communication type into relay identity. Distinct requests therefore do not
collide, while an identical replay retains its original semantic key.
