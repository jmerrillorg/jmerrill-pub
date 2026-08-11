# Reusable Remediation

Last verified: 2026-08-11T12:00:30Z

Files changed:

- `azure-functions/diagnostic-ai-runner/src/mail/publishingMailboxReader.js`
- `azure-functions/diagnostic-ai-runner/test/publishingMailboxReader.test.js`

Remediation summary:

- Added explicit shared-mailbox attachment metadata retrieval.
- Added explicit shared-mailbox file attachment retrieval.
- Preserved default reply reader behavior: it detects `hasAttachments` but does not ingest files.
- Preserved hardcoded mailbox boundary: `publishing@jmerrill.one`.
- Preserved gate: `JM1_PUBLISHING_MAIL_READ_ENABLED`.
- Preserved GET-only behavior.
- Added SHA-256 calculation for retrieved file bytes.
- Added source mailbox, message ID, attachment ID, retrieval timestamp, filename, content type, size, Graph type, and checksum fields.

No title-specific values were hardcoded.

