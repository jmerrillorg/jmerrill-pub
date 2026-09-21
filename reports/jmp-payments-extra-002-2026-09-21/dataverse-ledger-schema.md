# Dataverse Ledger Schema

Implementation: `PORTABLE_CONTRACT_COMPLETE`

Production: `NOT_IMPORTED`

The source contract is `powerplatform/solutions/JM1PublishingSales/payment-ledger-schema.json`. It defines agreement, scheduled-obligation, append-only payment-event, and collection-attempt tables; alternate keys for Stripe event/payment/idempotency identities; immutable original economics; derived balance fields; and four transactional Custom APIs.

Dataverse owns the Publishing obligation and processor-event projection, not the general ledger. QBO remains accounting authority. Balance mutation must occur only inside the transactional Custom APIs with an expected ETag. Authors and staff cannot edit balances, mark success, override reconciliation, or delete events.

The current exported solution does not contain these components. No schema import was attempted because the package requires zero financial effect and the QBO/customer authority gates remain unresolved.
