# Productions review checkpoint relay contract

Status: source candidate, not production acceptance.

Publishing owns the ACS relay. ONE owns the receipt, review deadline, calendar,
transition producer and retry state. This change adds no timer or scheduler.
Financial's exact inquiry lookup is unchanged.

## Caller and templates

Existing caller `one-bp09-productions-prod`, Entra object
`38b09d6f-34d9-48b3-9627-f04c047fd534`, brand `JMPRODUCTIONS`, recipient
`productions@jmerrill.one` only. No new identity or platform grant.

`PRODUCTIONS.BP09_NOTICE` version `1.0.0` retains its existing exact payload.
The following templates use version `1.0.0` and require exactly
`templateData.referenceId`, `leadId`, and `transitionId`, each a nonzero GUID:

- `PRODUCTIONS.BP09_REVIEW_OVERDUE`
- `PRODUCTIONS.BP09_REVIEW_RESOLVED`

Envelope fields remain exactly `brand`, `to`, `templateId`, `templateVersion`,
and `templateData`. No customer name, inquiry text, user URL, body or financial
content is accepted. The secure lead link is constructed by the relay.
Idempotency is `bp09:productions:review:<phase>:<referenceId>:<transitionId>`.
The producer must persist and reuse a transition ID across retry and restart;
it must not generate another transition ID to retry an uncertain send.

## Bound read-only receipt lookup

`POST /api/lookup-productions-review-notice` uses the same workload identity and
exact envelope, plus `receiptId` equal to the returned JM1 message UUID.
It validates caller, brand, recipient, template/version, receipt, transition,
business reference and complete rendered fingerprint against primary storage.
No sends or writes occur.

- `accepted`: exact provider acceptance timestamp and provider message ID.
- `failed`: exact failed receipt and its durable failure timestamp.
- `unknown`: absence, unavailable storage, unfinished reservation or conflict.

Every result has `retryAuthorized=false`. Unknown/absence is not permission to
resend. The existing sending owner governs a failure retry with the same exact
key only after its own authority and uncertainty checks.

No `delivered` result is claimed: ACS send completion and ledger ACCEPTED are
provider acceptance, not destination delivery. Delivered status requires an
independently bound authoritative delivery event/readback and timestamp. That
source must be established before destination delivery can be commissioned.

### Exact JSON response shapes

Request is the exact sending envelope above plus `receiptId` (JM1 message UUID,
not the ACS provider ID). The lookup never accepts an arbitrary message body.

HTTP 200 accepted:
```json
{"status":"accepted","receiptId":"<JM1 UUID>","providerMessageId":"<ACS ID>","acceptedAt":"<ISO timestamp>","deliveryEvidenceAvailable":false,"retryAuthorized":false}
```

HTTP 200 failed:
```json
{"status":"failed","receiptId":"<JM1 UUID>","failedAt":"<durable ISO timestamp>","retryAuthorized":false}
```

HTTP 503 unknown (missing receipt, unfinished reservation, stored mismatch,
unavailable primary storage or exception):
```json
{"status":"unknown","retryAuthorized":false}
```

HTTP 403 denied identity:
```json
{"status":"unknown","code":"LOOKUP_CALLER_DENIED","retryAuthorized":false}
```

HTTP 400 invalid probe:
```json
{"status":"unknown","code":"LOOKUP_REQUEST_INVALID","retryAuthorized":false}
```
Malformed/missing receipt UUID instead returns `code=LOOKUP_RECEIPT_REQUIRED`.
Codes and status values are strings, IDs/timestamps are strings, all false
values are JSON booleans. Failed/unknown responses have no provider message ID.
Unknown/denied/invalid responses expose no receipt or timestamp. There is no
`messageId` alias and no `deliveredAt` field in this candidate contract.

## Release and acceptance

Use the existing serialized protected relay deployment and preserve its LKG.
Verify exact SHA, existing Financial lookup parity, fixed caller/recipient
denials, independent overdue/resolved transition identity, duplicate safety,
and native acceptance lookup. Internal controlled recipient tests only.
Do not claim the ONE review checkpoint commissioned from these source tests.
