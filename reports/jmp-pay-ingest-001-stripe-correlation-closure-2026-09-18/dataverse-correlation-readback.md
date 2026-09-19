# Dataverse Correlation Readback

Existing production entities are sufficient:

- `opportunities`: selected payment amount, first-payment status/timestamp/source, agreement and author-portal gate fields.
- `jm1pub_contracts`: signed/active contract authority linked to Opportunity.
- `jm1_executionlogs`: durable source-record binding, semantic effect idempotency, agreement event fallback, notification result, and safe exception audit.
- `jm1_executionevents`: existing execution/audit surface; no new write contract required by this packet.

Bounded readback found four Core Dataverse Opportunities with established first-payment state and one UAT Whole payment-evidence record. Whole was the known valid paid event that required founder/manual reconciliation; it is already marked paid and is not silently mutated here.

No table, column, alternate identifier namespace, accounting entry, or ledger behavior was added.
