# Real Response Evidence

Last verified: 2026-08-12

## Mailbox

Authoritative mailbox inspected: `publishing@jmerrill.one`

Inspection method: Outlook shared-mailbox read connector, read-only.

## Matching Messages

Two matching self-addressed package-selection messages were present in the authoritative Publishing mailbox.

| Field | Message 1 | Message 2 |
| --- | --- | --- |
| Subject | My Publishing Package Selection | My Publishing Package Selection |
| Received | 2026-08-12T10:35:08Z | 2026-08-12T10:35:12Z |
| Sender | publishing@jmerrill.one | publishing@jmerrill.one |
| Recipient | publishing@jmerrill.one | publishing@jmerrill.one |
| Body preview | Let's move forward with the Starter package | Let's move forward with the Starter package |
| Attachments | false | false |
| Message ID | AAMkAGNiOTQzYmYyLTk0MDEtNGVlYS05NTgyLWFhMmUxM2Y0MzhiOQBGAAAAAACfs17WM6mYQJ_3z0t8_9doBwD_Xbi2Wq2JSYocf3NG5QZjAAAAAAEJAAD_Xbi2Wq2JSYocf3NG5QZjAADX93NUAAA= | AAMkAGNiOTQzYmYyLTk0MDEtNGVlYS05NTgyLWFhMmUxM2Y0MzhiOQBGAAAAAACfs17WM6mYQJ_3z0t8_9doBwD_Xbi2Wq2JSYocf3NG5QZjAAAAAAEMAAD_Xbi2Wq2JSYocf3NG5QZjAADX9qlaAAA= |

## Classification

Canonical interpretation: `STARTER_PACKAGE_SELECTED`

Selected package: `JMP-PKG-STARTER`

Clarification required: NO

Jackie gate required: NO

## Important Finding

The response path created self-addressed messages from `publishing@jmerrill.one` to `publishing@jmerrill.one`. The old mailbox reader intentionally ignored internal publishing senders for ordinary author-review responses. That safety rule was correct for approval-gate replies, but it made the governed mailto package-selection response invisible to the Stage 0 package-selection path.
