# Submission Idempotency And External IDs

Last Verified: 2026-08-26

## Idempotency

The same manifest/version/format/channel/territory resolves to one canonical channel distribution instance.

Retry behavior:

- preserves the canonical instance ID;
- appends attempt history;
- preserves external reference IDs;
- does not create duplicate distribution records;
- does not treat submission success as live.

## Attempt History

Attempt history is append-only in the commissioning model. A retry records a new attempt without overwriting prior attempt evidence.

## External IDs

External reference IDs are required before non-`NOT_SUBMITTED` external state reconciliation.

