# 28 - Acknowledgement Retry Proof

## Existing Failed Intake

| Field | Evidence |
| --- | --- |
| Intake | `JMP-INT-202608-OZT8IO` |
| Dataverse row | `02923fbd-019d-f111-b8dc-6045bdd69435` |
| Created | `2026-08-21T01:43:44Z` |
| Recipient | `chosen2k7@icloud.com` |
| Original failure retained | `AUTHOR_ACK_DISPATCH_FAILED`, `relay_rejected:503:unstructured_error_body` |

## Retry

The existing failed acknowledgement was retried through the governed relay route `send-author-acknowledgment`.

| Field | Evidence |
| --- | --- |
| Retry timestamp | `2026-08-21T07:29:08Z` |
| Relay result | HTTP 202 |
| Provider | `acs-email` |
| Provider acceptance ID | not returned by ACS SDK poller in this runtime response |
| Execution evidence | `AUTHOR_ACK_RETRY_SENT` |
| Dataverse final ack sent | `true` |
| Dataverse final ack status | `835500001` / Sent |
| Dataverse ack error | cleared |

## Mailbox Evidence

The Publishing mailbox received the CC copy.

| Field | Evidence |
| --- | --- |
| Mailbox | `publishing@jmerrill.one` |
| Subject | `We received your publishing inquiry - JMP-INT-202608-OZT8IO` |
| Sender | `DoNotReply@email.jmerrill.one` |
| To | `chosen2k7@icloud.com` |
| CC | `publishing@jmerrill.one` |
| Received | `2026-08-21T07:29:15Z` |
| Attachments | none |

Direct iCloud mailbox delivery was not verified; do not claim recipient delivery beyond provider/relay acceptance and Publishing CC mailbox receipt.

## Idempotency

Readback after success showed replay suppression conditions:

- `authorAckRetryWouldSend=false`
- `duplicateAckAfterSuccess=0`

