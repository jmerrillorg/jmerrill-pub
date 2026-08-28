# Defect Scope Analysis

Last Verified: 2026-08-28T01:36:47Z

## Defect Class

`AUTHOR_REVIEW_ATTACHMENT_LAST_MILE_V1`

## Scope Finding

The defect is systemic in the send path, not limited to one title:

- Package validation did not compare declared attachment checksum to actual bytes.
- ACS relay did not compare supplied attachment checksum to actual bytes.
- Diagnostic runner provider bridge could omit author-review attachments before relay validation.

## Title-Level Effect

Only Establishing Glory had a confirmed recipient-byte mismatch against the Dataverse certified artifact in this pass. The subsequent three-way comparison proved the recipient content matched the clean corrected SharePoint author-facing artifact.

## Recurrence Risk

Without the source repair, a future send could carry the right filename and wrong bytes or carry attachment metadata while a bridge omits the attachment payload. The new guards close that class before provider delivery.

