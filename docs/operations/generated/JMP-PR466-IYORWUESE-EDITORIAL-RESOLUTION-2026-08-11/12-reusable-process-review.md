# Reusable Process Review

Last Verified: 2026-08-11T11:45:00Z

## Canon Coverage

Existing canon covers:

| Area | Coverage |
| --- | --- |
| Dialect / vernacular / culturally specific language | Covered by voice-protection guidance |
| Character voice preservation | Covered |
| Intentional nonstandard grammar | Covered |
| Satire and fictionality handling | Partially covered by fiction/front-matter practice and developmental boundaries |
| Developmental vs line/copy boundaries | Covered |
| Author corrections after review | Covered as decision capture; attachment retention gap remains |

## Reusable Process Defect

The run exposed a reusable evidence-retention and retrieval defect: author responses with attachments or marked manuscripts must preserve the returned attachment or a governed attachment manifest in a retrievable location before editorial resolution begins. Visibility in Outlook Web is not enough if the attachment cannot be materialized for governed inspection.

## Recommended Governed Remediation

Create a bounded author-response attachment-retention rule for the canonical author-response runtime:

- store inbound response attachments as governed publishing artifacts;
- link attachments to the response record, title, stage, package, and execution event;
- record checksum, filename, mailbox message ID, received timestamp, and storage location;
- fail closed if an author references markings that are not preserved.
- provide a supported shared-mailbox attachment materialization path for operational recovery.

This recommendation is not implemented or approved by this run.
