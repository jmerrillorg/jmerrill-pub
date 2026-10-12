# Stage 04 bounded internal-message authentication

This is a technical authentication amendment, not an author election or a
commercial amendment. It applies only within the existing five-title Stage 04
allowlist. No mailbox permission changes are included.

## Verified tenant evidence

Authorized Exchange administration on October 12, 2026 established:

- App dc8d1429-8c1b-473b-83ca-f9545fad8074; service principal
  e8c51a80-bdb0-46fa-b398-9109719d6427.
- Application access policy JM1 Publishing Mail Read Scope: Publishing Granted,
  Jackie Denied. Exchange Application Mail.Read custom-scope tests independently
  return Publishing InScope=True and Jackie InScope=False.
- Publishing mailbox 8a519ced-ddf5-4d1d-92ce-66a79de23ed4 and Jackie mailbox
  9586f34b-b5f3-437b-bc64-3e44d2518427 are current UserMailbox recipients.
- At 21:05:01Z, Get-InboundConnector returned an empty list. The only transport
  rule was disabled and did not set or remove headers.
- Entra Graph application assignment includes Mail.Read. Its application-access
  restriction and Exchange RBAC are both considered; RBAC alone is not proof.

Readbacks are preserved in the existing title-commissioning evidence packet:
stage04-exchange-scope-2026-10-12T20-49-42-161Z.json,
stage04-exchange-scope-2026-10-12T21-05-01-804Z.json and
stage04-exchange-scope-2026-10-12T21-06-09-790Z.json.

## Validation boundary

The internal path requires native Graph custody from the Publishing mailbox,
matching From and Sender, unique Exchange organization authentication fields,
an intact Microsoft mailbox-origin Received chain ending in MAPI submission,
and a network message identity. External/forwarded chains, duplicated authority
headers, authentication failures and mismatched original-offer reply IDs fail
closed. The ordinary external DMARC path remains separate.

Microsoft describes organization-header protection and the connector paths
that can classify externally originated messages as Internal:

- https://learn.microsoft.com/en-us/Exchange/header-firewall-exchange-2013-help
- https://techcommunity.microsoft.com/blog/exchange/demystifying-and-troubleshooting-hybrid-mail-flow-when-is-a-message-internal/1420838/

An Internal string alone is never authority. This bounded tenant snapshot expires
at 2026-10-13T21:05:01.804Z. Renewal requires fresh authorized tenant evidence;
it must not be extended merely to force acceptance. No recurring scheduler or
broader permission is created. Outbound DMARC remains independently unverified.

The exact original offer, version, sender and explicit decision remain required.
Only the preserved exact corporate signature is additionally recognized by hash;
extra conditions or other text remain for review. Publisher approval never
substitutes for author consent. Agreement execution and spending remain gated.

## Recovery and rollback

Only the specific held author-mailbox 403 can recover, once per policy version,
after a fresh authenticated exact-thread receipt succeeds. The prior hold is
retained in an immutable recovery record. Recovery does not call the sender.
Disable the dedicated Stage 04 flag to contain a failed proof. Preserve receipts,
responses and recovery history; never remove an acceptance to manufacture replay.
Broad stage, review and wait workers remain disabled.
