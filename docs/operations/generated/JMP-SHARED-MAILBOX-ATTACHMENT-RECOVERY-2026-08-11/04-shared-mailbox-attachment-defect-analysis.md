# Shared-Mailbox Attachment Defect Analysis

Last verified: 2026-08-11T12:00:30Z

Defect confirmed as reusable and not title-specific.

Observed facts:

- The existing runtime reader captures message bodies from `publishing@jmerrill.one` through Microsoft Graph.
- The existing runtime reader did not retrieve attachments.
- The Outlook connector can fetch the shared mailbox message body through `_fetch_shared_message`.
- The Outlook connector attachment tools do not accept a shared mailbox owner parameter.
- When the shared mailbox message ID is passed to `_list_attachments`, the connector targets the signed-in mailbox and returns `ErrorInvalidMailboxItemId`.
- Local Graph probe to `/users/publishing@jmerrill.one/messages/{message-id}/attachments` returns HTTP 403 before metadata is returned.
- Outlook Web shows the attachment and Word preview opens it, but browser automation is not a governed ingestion mechanism and did not emit a recoverable local file.

Cause classification:

- Runtime omission: current Publishing mailbox reader had no explicit attachment retrieval path.
- Connector limitation: generic attachment connector binds to the signed-in mailbox for shared-message IDs.
- Permission/configuration block: the available local Graph credential cannot read shared mailbox attachments and returns 403.

Confirmed not proven:

- The 403 is not proven to mean the production managed identity lacks application Mail.Read. It proves only that the available local credential path cannot retrieve this shared mailbox attachment.

