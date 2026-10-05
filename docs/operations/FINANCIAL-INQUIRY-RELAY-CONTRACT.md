# Financial inquiry reference notice

The existing enterprise ACS relay owns delivery transport and its message ledger.
Financial owns the ordinary inquiry receipt, Lead linkage, owner routing and
outbox/recovery. This addition does not create a Contact, APS session, pilot,
payment or client communication and does not enable public inquiry.

## Identity and exact contract

Existing Function `func-jm1-fin-prod` system principal:
`658e6d91-1d9d-493f-83bd-f327eaf74ac1`.
Caller: `financial-inquiry-function-prod`.
Token audience: `api://84530e9b-2842-4ca6-8fe6-1a11eed051d1`.
Use real managed-identity tokens verified by existing relay EasyAuth. Do not
manufacture platform principal headers, use an operator token as runtime proof,
or broaden the Publishing legacy shared key.

Host: `https://func-jm1-acs-email-relay.azurewebsites.net`.
No-send POST: `/api/relay-authority-probe`.
Owner dispatch POST: `/api/send-enterprise-governed-email`.

Both routes require exactly this five-key body:

```json
{
  "brand": "JMF",
  "to": "financial@jmerrill.one",
  "templateId": "FINANCIAL.INQUIRY_NOTICE",
  "templateVersion": "1.0.0",
  "templateData": {
    "referenceId": "90000000-0000-4000-a000-000000000029"
  }
}
```

The example is synthetic, not authorization to send. Reference must be the
owner's persisted inquiry reference in nonzero lowercase D-format GUID form.
The owner must prove exact receipt/Lead lookup before dispatch; the relay does
not read or write Dataverse or establish business identity.

Only `templateData.referenceId` varies. Reject extra fields including client
name/email, inquiry body, URLs, attachments, subject, body, recipients, sender,
reply-to, CC/BCC, caller idempotency key and caller trace identifiers.

Relay derives:

| Value | Authority |
| --- | --- |
| From | `financial@email.jmerrill.one` |
| To, reply-to, required CC | `financial@jmerrill.one` |
| Subject | Financial inquiry ready for review |
| Audience | `INTERNAL_OPERATIONS` |
| Business object | `FINANCIAL_INQUIRY_RECEIPT` |
| Business object ID, source record, correlation | Exact reference GUID |
| Message type | `INTERNAL_INQUIRY_NOTICE` |
| Risk | `ROUTINE` |
| Idempotency key | `financial:inquiry:notice:<referenceId>` |

Multipart body is fixed internal-review wording, the reference, and Financial
signature. No client content, advice, link or product claim. The narrow internal
GUID allowance does not change public/client content or Financial compliance
filters. Other callers cannot borrow this template, and the Financial caller
cannot use any other brand, template or recipient. No wildcard grant is added.

## Replay and acceptance

- Probe200: authorized/noSend true, attributed caller, fixed sender/recipient
  and derived key/hashes. No ledger reservation or provider call.
- Initial completed provider acceptance:202, accepted true, replay false,
  durable jm1MessageId/providerMessageId.
- Exact accepted replay:200, replay true, same IDs, no second provider effect.
- Changed fingerprint under a used key:409 IDEMPOTENCY_KEY_CONFLICT.
- Reserved/submitted ambiguity:202, accepted false, inProgress true on replay.
  A transport failure can initially return502. Preserve it for exact provider
  reconciliation; never create a new key or erase the reservation to resend.
- Before-reservation failure can retry the exact envelope; existing explicit
  FAILED reservation recovery uses compare-and-swap. Financial owns bounded
  outbox retries, alerting and unresolved-result visibility.

ACCEPTED/PROVIDER_ACCEPTED is not recipient delivery. The current Publishing
mailbox verifier remains JMP-only. Live acceptance must preserve exact provider
and message IDs and independently verify the corresponding Financial mailbox
message, internal-only body, From/To/CC, reference and timestamp. Preserve native
message identity or transport correlation when available. Same subject alone
is not identity proof. Check recipient-copy behavior because To and CC are the
same governed mailbox; do not assume mailbox deduplication.

## Release and containment

Use the existing relay PR validation and canonical main deployment. Recheck
current repository/environment controls, validate full relay suite and audit,
then verify deployed SHA, package, auth and actual Function-identity no-send
positive/negative probes. Keep Financial public inquiry and pilot gates OFF.
Only separately authorized controlled internal synthetic notices may be used
for live delivery/replay proof. No real client communication.

No Entra, ACS, Graph, mailbox or Dataverse permission changes are part of this
extension. If exact Function authentication or authorized mailbox access is
unavailable, preserve that precise security gate; do not use broader credentials.

On failed acceptance disable Financial owner dispatch, retain receipt/outbox and
relay ledger evidence, and use the existing protected release/rollback controls.
Do not reset ambiguous sends or affect other relay callers. This is not a new
pipeline, queue, timer, receipt store or Financial workflow engine.
