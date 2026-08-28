# Last-Mile Commissioning Scorecard

Last Verified: 2026-08-27T18:43:03Z

| Requirement | Status | Evidence |
| --- | --- | --- |
| Microsoft-first mailbox evidence | PASS | Publishing mailbox used; Gmail fallback 0. |
| Recipient mailbox attachment retrieval | PASS | Attachment bytes retrieved through governed diagnostic route. |
| Recipient attachment checksum calculation | PASS | Recipient attachment SHA256 computed from decoded mailbox bytes. |
| Certified artifact checksum calculation | PASS | Certified artifact SHA256 read from governed artifact and downloaded SharePoint bytes. |
| Exact checksum equality | FAIL | Certified `e09414df...`; recipient `9aae176d...`. |
| Author response recognition | PASS | Establishing Glory approval reply found and classified. |
| Approval bound to exact artifact | FAIL-CLOSED | Approval not consumed because attachment hash mismatch exists. |
| Long Watch future release protected | PASS | Not sent early; Line rerun 0. |

## Human Last-Mile Classification

`JMP_HUMAN_LAST_MILE_CONTROLLED_COMMISSIONING`

The system now has the tooling to retrieve and verify recipient attachments, but the first exact Establishing Glory proof failed. The gate is therefore controlled and fail-closed, not commissioned.

