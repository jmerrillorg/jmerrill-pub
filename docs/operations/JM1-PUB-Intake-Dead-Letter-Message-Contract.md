# JM1-PUB Intake Dead-Letter Message Contract

Status: Active source contract
Schema: `JM1_PUBLISHING_INTAKE_DEAD_LETTER_V1`

## Allowed Fields

| Field | Purpose |
|---|---|
| `schema` | Contract identifier |
| `intakeReference` | Governed public receipt/reference |
| `dataverseRecordId` | Existing Publishing Intake row ID, when available |
| `contactId` | Existing Contact ID, when a downstream step already resolved it |
| `sharePointItemId` | Governed SharePoint item ID, when needed |
| `sharePointDriveItemId` | Governed Graph drive item ID, when needed |
| `workspaceFolderId` | Governed workspace folder identifier |
| `correlationId` | Idempotency/correlation value |
| `failedOperationType` | Exact failed downstream operation |
| `failureClassification` | Governed failure class |
| `retryCount` | Current retry count |
| `maxRetryCount` | Maximum queue retry count |
| `firstFailureAt` | First failure timestamp |
| `latestFailureAt` | Latest failure timestamp |
| `sourceDeploymentSha` | Deployment/source identifier |
| `safeErrorCode` | Sanitized error code |
| `environment` | Runtime environment |

## Prohibited Fields

- manuscript body or attachment bytes;
- raw email body;
- full author-sensitive data;
- banking, tax, Stripe, Account Link, payout, or payment data;
- secrets, tokens, cookies, session material, API keys, or hashes of secrets;
- reusable public or SharePoint download URLs.

## Retry and Poison Policy

- Immediate controlled retry in route: handled by existing Dataverse retry wrapper.
- Queue retries: `5`.
- Backoff: Azure queue visibility timeout or operator-controlled increasing delay.
- Exhausted retries: poison/operator exception.
- Replay key: `intake-replay:{intakeReference}:{failedOperationType}:{dataverseRecordId|pending-record}`.

