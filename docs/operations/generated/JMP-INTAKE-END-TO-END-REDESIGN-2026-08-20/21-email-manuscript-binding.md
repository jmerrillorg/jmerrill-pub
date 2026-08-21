# Email Manuscript Binding

Status: implemented locally; production test pending.

Protected endpoint:

- `POST /api/publisher/operating-center/email-manuscript-bind`
- Requires Publisher Operating Center session.

Required input:

- `intakeId`
- `messageId`
- `attachmentId`
- optional `mailbox`, default `publishing@jmerrill.one`

Implementation:

- Reads the exact Microsoft Graph message and attachment from the Publishing mailbox.
- Requires file attachment content.
- Validates file name, size, and supported extension.
- Uploads the original file to the governed inquiry SharePoint workspace.
- Writes a source-artifact manifest with email provenance.
- Patches the existing Dataverse intake with manuscript URL/workspace evidence.
- Records an execution log.
- Replays the same intake/message/attachment as idempotent when already bound.

No email message body or manuscript content is stored in Dataverse.

Production prerequisites:

- Graph app credentials must have permission to read `publishing@jmerrill.one` messages and attachments.
- Operator must provide exact message and attachment identifiers.

