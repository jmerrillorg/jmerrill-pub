# 29 - Internal Notification Retry Proof

## Existing Failed Notification

| Field | Evidence |
| --- | --- |
| Intake | `JMP-INT-202608-OZT8IO` |
| Original failure retained | `JOIN_INTERNAL_NOTIFICATION_FAILED`, `relay_rejected:503:unstructured_error_body` |

## Retry

The existing failed internal notification was retried through the governed relay route `send-join-internal-notification`.

| Field | Evidence |
| --- | --- |
| Retry timestamp | `2026-08-21T07:29:09Z` |
| Relay result | HTTP 202 |
| Provider | `acs-email` |
| Provider acceptance ID | not returned by ACS SDK poller in this runtime response |
| Execution evidence | `JOIN_INTERNAL_NOTIFICATION_RETRY_SENT` |
| Recipient | `publishing@jmerrill.one` |

## Mailbox Evidence

| Field | Evidence |
| --- | --- |
| Mailbox | `publishing@jmerrill.one` |
| Subject | `New /join Intake - JMP-INT-202608-OZT8IO - New Book Test` |
| Sender | `DoNotReply@email.jmerrill.one` |
| To | `publishing@jmerrill.one` |
| Received | `2026-08-21T07:29:17Z` |
| Attachments | none |

## Idempotency

Readback after success showed replay suppression conditions:

- `internalNotificationRetryWouldSend=false`
- `duplicateInternalNotificationAfterSuccess=0`

