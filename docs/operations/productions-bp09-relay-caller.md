# Productions BP-09 Relay Caller

Packet: `JM1-PRD-BP09-RELAY-CALLER-COMMISSIONING-001`.

This is the transport boundary for the existing ONE intake owner. It does not
commission the public Productions form, assign a reviewer, establish retention,
create a lead, or authorize client correspondence. Source contract:
[OPS PR #269](https://github.com/jmerrillorg/jm1-ops/pull/269), merge
`bf1563c92e43a6d59df326bc0a8921ad365260ef`,
`docs/governance/enterprise-orchestration/productions-bp09-reference-journey.md`.

## Identity And Authority

- Caller `one-bp09-productions-prod`: existing system-assigned identity of
  `func-jm1-marketing-runtime`, resource group `rg-jm1-ai`.
- Principal `38b09d6f-34d9-48b3-9627-f04c047fd534`, application ID
  `e6a47c11-b42c-424a-8e4b-241be8f1050a`, tenant
  `352d075e-8e17-4169-9f8e-22e6946ce66d`.
- Token audience `api://84530e9b-2842-4ca6-8fe6-1a11eed051d1`; obtain a token
  through the existing Function managed identity. Never transmit or synthesize
  `x-ms-client-principal` headers from the caller. Existing relay Easy Auth
  validates the token and supplies the principal.
- Only brand `JMPRODUCTIONS`, template `PRODUCTIONS.BP09_NOTICE` version `1.0.0`,
  and destination `productions@jmerrill.one` are authorized. No all-brand grant,
  relay key redistribution, new identity, Azure role grant or Dataverse grant.
- From `productions@email.jmerrill.one`; Reply-To and mandatory visibility copy
  `productions@jmerrill.one`, resolved by the existing sender registry.

The relay continues using its existing ACS credential and `JM1RelayMessages`
Azure Table authority. No new provider, table, queue, schema or business writer.
Publishing and JSJ grants and existing ledger rows are preserved.

## Request And No-Send Preflight

Use the same exact JSON for the existing `/api/relay-authority-probe` (no send,
no reservation) and `/api/send-enterprise-governed-email` (delivery):

```json
{
  "brand": "JMPRODUCTIONS",
  "to": "productions@jmerrill.one",
  "templateId": "PRODUCTIONS.BP09_NOTICE",
  "templateVersion": "1.0.0",
  "templateData": {
    "referenceId": "90000000-0000-4000-a000-000000000009",
    "leadId": "90000000-0000-4000-a000-000000000010"
  }
}
```

These IDs are local fixtures, not production receipt evidence. A live test must
use one preserved synthetic BP-09 receipt and its exact linked Lead, verified by
ONE, not create a fake inquiry. Both IDs must be nonzero lowercase GUIDs.
All other fields are rejected, including subject, body, HTML, attachments,
names, email addresses, URLs, recipient aliases, BCC, sender overrides and
caller-selected idempotency keys. Nested extra fields are rejected too.

The renderer creates only an internal notice, opaque receipt reference and
secure Lead link under `https://jm1hq.crm.dynamics.com`. It never receives the
inquiry body. The internal-reference document contract is confined to this
strict template; author-facing human-first validation is unchanged.

## ONE Owner Integration

Current ONE `main` inspected at `3a0c363c047cc2a16db5a1768cede989139a5478`:
`runtime/jm1-marketing-autonomous-functions/src/lib/intake.js` has no relay call.
The relay cannot certify automated notification merely by registering a caller.

ONE must read its existing `BP09WebsiteIntakeV2` receipt and verify state
`COMPLETED`, routing destination `J Merrill Productions`, channel
`jmerrill.productions/contact`, exact receipt/request digest, Lead reference and
linked Contact. ONE owns these business joins; PUB does not copy this logic or
read/store inquiry content. Derive the two payload IDs from that exact readback.
Do not invoke for `RECEIVED`, `PROCESSING`, `RETRY_PENDING`, `ESCALATED`, another
brand, an unresolved identity, or an unbound Lead. Do not reopen the public form.

Use the existing ONE intake/reconciliation owner to persist notification attempt
and result references without changing the accepted receipt's business meaning.
Do not write into the 2,000-character receipt description without validating its
capacity and existing schema. Owner changes require their own normal review.

## Results, Retry And Reconciliation

The relay derives `bp09:productions:notice:<referenceId>` and uses the existing
atomic ledger reservation. Receipt, caller, brand, template and rendered hashes
bind the effect. Changing the linked Lead under that key fails with
HTTP 409 `IDEMPOTENCY_KEY_CONFLICT`; do not retry this deterministic conflict
as a transient provider failure. Changing a caller-supplied key is impossible.

- First completed ACS submission: HTTP 202, `accepted=true`, `jm1MessageId`,
  `providerMessageId`, `deliveryState=ACCEPTED`. This is provider acceptance, not
  proof of recipient mailbox delivery or completed business follow-up.
- Accepted replay: HTTP 200 with the same durable IDs, no new ACS submission.
- Uncertain send or persistence outcome: reservation remains; exact replay
  returns 202, `accepted=false`, `inProgress=true`. Do not allocate a new key or
  blindly resend. Reconcile the existing provider ID/ledger and alert the
  existing transport owner. No automatic stale-reservation stealing is added.
- Failure before a reservation: exact-request retry is safe. Existing
  pre-submission FAILED rows use the ledger's ETag retry ownership. ONE owns
  bounded retry/backoff and escalation; this PR does not add another scheduler.

The Table stores record IDs, recipient, sender, hashes, status and provider IDs,
not template data, inquiry body or rendered content for this internal brand.
Destination proof must independently join native mailbox/provider identity to
the same notice. Publishing's mailbox-verification worker is not a generic
Productions verifier and is not changed or enabled by this packet.

## Release And Acceptance

Run the complete relay tests with Node 22, syntax validation and dependency
audit. Review negative caller/brand/template/destination/content tests and
durable replay/failure tests before merge. Use only
`.github/workflows/azure-functions-acs-relay-flex.yml` through normal PR and
production-environment controls. Recheck current main and changes before merge.
Verify `JM1_RELEASE_SHA`, canonical package name, host auth boundary and private
ledger configuration. Do not log SAS values, connection strings or tokens.

Then the ONE owner invokes the no-send probe using its real managed identity,
followed by at most one authorized internal notice for a preserved synthetic
receipt. Require provider ID, ledger readback, recipient mailbox ID, exact replay
and any failure/recovery evidence. Never label source fixtures as live proof.
Public intake activation, reviewer access and policy approval remain separate.

Rollback: first stop the ONE notification producer; preserve all message rows,
provider IDs and receipts. Revert only this caller/template change through a
reviewed canonical relay release. Do not restore unrelated old application or
Function artifacts, delete ledger rows, replay uncertain notices, or alter
Publishing/JSJ identities. Atta and Publishing stage workers are out of scope.
