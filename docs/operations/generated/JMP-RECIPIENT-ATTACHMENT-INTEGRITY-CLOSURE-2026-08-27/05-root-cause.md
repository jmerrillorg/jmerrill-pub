# Root Cause

Last Verified: 2026-08-28T01:36:47Z

## Root Cause Classification

`AUTHOR_FACING_ARTIFACT_BINDING_AND_LAST_MILE_CHECKSUM_GUARD_DEFECT`

## Evidence

1. Dataverse held the internal wrapper artifact as the certified/current artifact for the Establishing Glory developmental manuscript.
2. The actual corrected author-facing file existed in SharePoint and was delivered to the recipient.
3. The corrected SharePoint file was not discoverable as a structured Dataverse editorial artifact by its SHA256 during this pass.
4. The package/notification path accepted attachment metadata with a checksum label but did not compare that declared checksum to the actual attachment bytes.
5. The ACS relay accepted author-review package attachments without checksum comparison.
6. The diagnostic-runner ACS provider bridge could omit attachments from the relay payload, creating a competing path that could pass a send without attachment-level relay validation.

## What SHA `9aae176...` Represents

`9aae176de7b318fec3d4e8c7b9ebf7750433261a4130dffcd14e4a50d4b9abf1` is the decoded DOCX attachment retrieved from the governed Publishing mailbox for the corrected Establishing Glory delivery. Its document XML and visible text match the SharePoint corrected author-facing artifact, not the Dataverse internal wrapper artifact.

## Where The Divergence Occurred

The divergence occurred before/at package binding:

Dataverse certified artifact was the internal wrapper artifact, while the delivered package attachment was the clean corrected SharePoint derivative. The send path did not enforce that the attachment bytes matched the declared/certified checksum before relay, so the structured artifact label and the delivered payload could diverge.

