# Post-Send Verification

Last Verified: 2026-08-28T01:36:47Z

## Establishing Glory

Post-send verification retrieved the actual recipient mailbox attachment from `publishing@jmerrill.one`.

| Verification | Result |
| --- | --- |
| Mailbox attachment materialized | PASS |
| DOCX opens as OOXML ZIP | PASS |
| `word/document.xml` extracted | PASS |
| Recipient content equals corrected SharePoint artifact | PASS |
| Recipient content equals Dataverse certified internal artifact | FAIL |
| Additional corrective send | NOT REQUIRED |

## Future Standard

For future author-review sends, pre-send certification must compare declared checksum to decoded payload bytes. Post-send readback should retrieve recipient bytes where available. If the provider rewrites OOXML containers, content-level equivalence must include at least document XML hash and visible-text hash.

