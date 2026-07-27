# JM1-PUB Intake Resilience Standard

Status: Active source standard
Scope: INT-PUB-005 `/join` public publishing intake

## Receipt Boundary

The minimum durable receipt boundary is:

1. governed intake reference assigned;
2. Dataverse Publishing Intake row created or idempotently confirmed;
3. manuscript preserved in the governed SharePoint workspace, or a governed recovery record exists for the received artifact reference;
4. source correlation ID recorded.

Once this boundary is met, optional downstream notification, status writeback, execution logging, or enrichment failure must not invalidate the receipt or instruct the author to resubmit.

## Processing Pattern

```text
Public intake request
-> validate request and Turnstile
-> validate manuscript input
-> create workspace/preserve manuscript when supplied
-> create or idempotently confirm Dataverse intake
-> return durable receipt
-> attempt downstream notification/enrichment
-> enqueue sanitized recovery message on recoverable failure
-> replay failed operation by intake reference and operation type
```

The recovery queue is not the primary intake path. It is only used after valid input passes or durable work has begun.

## Non-Recoverable Failures

Do not enqueue:

- `INVALID_TURNSTILE`
- `UNSUPPORTED_FILE`
- `MISSING_REQUIRED_FIELD`
- `INVALID_FILE_SIZE`
- `MALFORMED_REQUEST`
- `DUPLICATE_IDEMPOTENCY_KEY`

These failures are author-input or duplicate-control outcomes and must return controlled public responses.

## Recoverable Failures

Queueable classifications:

- `DATAVERSE_ENRICHMENT_FAILED`
- `SHAREPOINT_SECONDARY_SETUP_FAILED`
- `PUBLISHING_NOTIFICATION_FAILED`
- `EXECUTION_LOG_WRITE_FAILED`
- `STATUS_WRITEBACK_FAILED`
- `TRANSIENT_MICROSOFT_DEPENDENCY_FAILURE`
- `UNKNOWN_RECOVERABLE_FAILURE`

## Queue Service

Selected service: Azure Storage Queue

Reason: lowest-complexity Azure-native queue fit for bounded intake recovery messages, compatible with current Static Web Apps managed server runtime, and sufficient for identifier-only recovery events.

Production queue name: `jm1-pub-intake-deadletter-prod`
Preview queue name: `jm1-pub-intake-deadletter-preview`

Runtime settings:

- `AZURE_STORAGE_CONNECTION_STRING`
- `INTAKE_DEADLETTER_QUEUE_NAME`

Preferred future App Service posture: replace connection-string access with managed identity once the App Service migration is authorized and the runtime supports identity-based queue operations consistently.

## Security

Messages must not contain manuscript content, full author-sensitive data, raw email bodies, tokens, secrets, cookies, Stripe links, banking or tax data, or reusable SharePoint URLs.

Use governed identifiers only: intake reference, Dataverse record ID, SharePoint item or drive item ID, workspace folder ID, correlation ID, operation type, classification, retry state, timestamp, deployment SHA, and safe error code.

