# General's Will Corrected Delivery Evidence

Last verified: 2026-08-26T15:35:00Z

## Delivery Action

- Title: The General's Will and Last Testament
- Author: Iyorwuese Hagher
- Intake reference: JMP-INT-202607-DL2T20
- Subject: Corrected Developmental Review - The General's Will and Last Testament
- Sender: publishing@email.jmerrill.one
- Reply-To authority: publishing@jmerrill.one
- Internal visibility copy: publishing@jmerrill.one
- Recipient: hagher.hagher@ymail.com
- Template: AUTHOR_FINAL_DEVELOPMENTAL_REVIEW_V1
- Template version: human-first-corrected-v1
- Corrected delivery timestamp: 2026-08-26T15:15:30.850Z
- ACS relay acceptance: 202 Accepted
- Diagnostic ID: 2557f449-5f93-4be6-959b-faab350be7c7

## Author-Facing Attachments

| Attachment | Source | SHA-256 | Size |
| --- | --- | --- | --- |
| The General's Will and Last Testament - Author Review Manuscript.docx | `docs/operations/generated/PROGRAM-008-AUTHOR-REVIEW-PREP-2026-08-04/packages/the-generals-will-and-last-testament/the-generals-will-and-last-testament-Author-Review-Manuscript.docx` | `246d722e2a103a1b04fa138edfffbd9b7fcd14ba1ae2cefafc912f8cb0188dba` | 343,897 bytes |
| The General's Will and Last Testament - Review Guide.pdf | `docs/operations/generated/PROGRAM-008-AUTHOR-REVIEW-PREP-2026-08-04/packages/the-generals-will-and-last-testament/the-generals-will-and-last-testament-Editorial-Review-Guide.pdf` | `a91893c4d16d1a2f92abdbf7e4ac95b1d600bf2bbf44a83b1386881bf545069f` | 3,479 bytes |

## Mailbox Readback

Governed mailbox: publishing@jmerrill.one

Readback from the governed Publishing mailbox confirmed:

- Message subject matched the corrected delivery subject.
- Sender displayed as J Merrill Publishing <publishing@email.jmerrill.one>.
- Recipient was hagher.hagher@ymail.com.
- CC included publishing@jmerrill.one.
- Received timestamp was 2026-08-26T15:15:47Z.
- `hasAttachments` was true.

## Response Clock

The earlier delivery remains preserved as invalid-delivery evidence because the review artifact was not a complete author-review manuscript. The author-response clock is governed from the corrected valid delivery timestamp above.

## Rendering Caveat

Mailbox readback showed the author-facing body included the Publishing signature/footer twice. The message content remained human-readable, reached the correct recipient, used the correct sender and visibility copy, and included the required author-facing attachments. This is preserved as a delivery-quality caveat, not erased.

Follow-up hardening added after readback:

- Author-review relay validation now rejects duplicate canonical Publishing footer blocks.
- Regression test added: `final developmental review rejects duplicate author-facing signatures`.

