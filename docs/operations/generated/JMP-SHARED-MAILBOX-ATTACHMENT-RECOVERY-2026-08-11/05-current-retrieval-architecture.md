# Current Retrieval Architecture

Last verified: 2026-08-11T12:00:30Z

Message body retrieval:

- Module: `azure-functions/diagnostic-ai-runner/src/mail/publishingMailboxReader.js`
- Mailbox: `publishing@jmerrill.one`
- Graph path: `/users/publishing@jmerrill.one/mailFolders/inbox/messages`
- Method: GET
- Gate: `JM1_PUBLISHING_MAIL_READ_ENABLED`
- Token source: `DefaultAzureCredential`

Attachment retrieval before remediation:

- No runtime attachment retrieval existed in the Publishing mailbox reader.
- A source comment explicitly stated that the reader never ingested attachments.
- The default reply reader did not select or consume `hasAttachments`.

Attachment retrieval after remediation:

- The default reply reader selects `hasAttachments` only.
- The default reply reader still does not call `/attachments`.
- Explicit attachment metadata listing and file fetch functions now exist.
- The new functions are hardcoded to `publishing@jmerrill.one`, gate-protected, and GET-only.

