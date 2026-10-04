# Foundation volunteer inquiry notice

This internal reference-only path belongs to the existing enterprise ACS relay.
Foundation owns intake, the durable receipt, reviewer workflow and notice outbox.
This contract neither enables the public form nor commissions mailbox delivery.

## Exact request

Authenticate using the existing Foundation web managed identity, object ID
`cb36ea0b-8ba6-4798-a836-47a52e340675`, and an Entra token for relay audience
`api://84530e9b-2842-4ca6-8fe6-1a11eed051d1`. Do not use the legacy shared key or
caller-forged platform identity headers. Existing EasyAuth must validate the
token and supply the identity. No Azure/ACS or Graph permission grant is added.

POST this exact JSON envelope to `/api/relay-authority-probe` for a no-send check,
or to `/api/send-enterprise-governed-email` for authorized owner dispatch:

```json
{
  "brand": "JMFN",
  "to": "foundation@jmerrill.one",
  "templateId": "FOUNDATION.VOLUNTEER_INQUIRY_NOTICE",
  "templateVersion": "1.0.0",
  "templateData": {
    "referenceId": "90000000-0000-4000-a000-000000000019"
  }
}
```

The example reference is synthetic, not an instruction to send. Production
references must be the receipt's exact nonzero lowercase D-format submission
GUID. OPS/Foundation authority confirms that field is a unique alternate key
and the Foundation-only reviewer supports exact reference lookup. The relay
does not independently read or create the receipt; its existing workload owner
must bind and persist the receipt before invoking this template.

Only the five top-level fields and `templateData.referenceId` are accepted.
Name, email, message, URLs, attachments, subject, body, sender, reply-to, CC, BCC,
alternate recipients and additional fields are rejected, not silently ignored.
The GUID is permitted only in this fixed internal template, never as a general
exception to human-first author/client presentation rules.

## Relay-derived values

| Field | Fixed rule |
| --- | --- |
| Caller | `foundation-volunteer-web-prod` |
| Brand | `JMFN` |
| Sender | `foundation@email.jmerrill.one` |
| To, reply-to, required CC | `foundation@jmerrill.one` |
| Subject | Volunteer inquiry ready for review |
| Audience | `INTERNAL_OPERATIONS` |
| Business object type | `FOUNDATION_VOLUNTEER_INQUIRY_RECEIPT` |
| Business object ID, correlation ID, source record | Exact referenceId |
| Message type | `INTERNAL_VOLUNTEER_INQUIRY_NOTICE` |
| Risk | `ROUTINE` |
| Idempotency key | `foundation:volunteer-inquiry:notice:<referenceId>` |

None of those derived fields may be supplied as extra envelope fields. The
existing sender policy requires the Foundation archive CC even when To is the
same mailbox; actual recipient-copy behavior must be read back, not assumed.
The template uses no external link. The body contains only static instructions,
the reference and the Foundation signature. Content hashes and message IDs are
stored in the existing relay ledger, not constituent content.

## Response and recovery

- No-send probe: 200, `authorized:true`, `noSend:true`; no ledger/provider access.
- First completed provider acceptance: 202, `accepted:true`, `replay:false`,
  stable `jm1MessageId`, `providerMessageId` and `acceptedAt`.
- Accepted exact replay: 200, `accepted:true`, `replay:true`, same durable IDs;
  no additional provider call.
- Reserved/submitted ambiguity: 202 on exact replay, `accepted:false`,
  `inProgress:true`. Retain the outbox and reconcile; do not invent a new key or
  retry by bypassing the reservation. Transport failure may first return 502.
- A changed effect under a used key: 409 `IDEMPOTENCY_KEY_CONFLICT`.
- A failure before a reservation is created may retry the same envelope. An
  explicitly FAILED ledger reservation uses the existing compare-and-swap retry
  path. No relay timer, new queue or second outbox is introduced.

Provider acceptance is not mailbox delivery. Do not mark Foundation review
notice delivered or enable public intake solely from `accepted:true`.
Foundation owns bounded retries/backoff and visibility of uncertain results.
An unresolved SUBMITTED reservation requires exact provider/mailbox evidence
and an approved recovery path, not blind resend or manual state reset.

## Acceptance and release gates

Run current-head relay tests, lint, dependency audit and normal protected release.
Verify deployed SHA and EasyAuth with the Foundation managed identity. Require
the no-send probe to pass and cross-brand/template/recipient probes to deny.
Only then may the governed owner exercise a separately bounded internal notice.

Current mailbox evidence gate: OPS reports a connected Foundation Office 365
connection, but no proven unattended, narrowly scoped read identity. The
Foundation owner reports its administrator Graph Inbox read was denied. Use an
authorized Foundation signed-in mailbox session or a separately approved narrow
verifier to match the exact provider/message identity, reference, sender,
recipient and timestamp. Do not widen Publishing's JMP-only verification reader.
Preserve provider acceptance separately from mailbox proof and verify replay
without duplicate provider effects. No constituent mail or marketing send.

Rollback/containment: Foundation public intake stays OFF and its notice caller
remains disabled until commissioning. On failed release/authority proof stop
owner dispatch, retain outbox and ledger records, and use normal protected relay
rollback/revocation controls. Never erase reservations or broaden brand access.
