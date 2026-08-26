# The General's Will Artifact Validation

Last verified: 2026-08-26

## Source Evidence

| Artifact | SHA-256 | Word count | Finding |
| --- | --- | ---: | --- |
| `JMP-SHARED-MAILBOX-ATTACHMENT-RECOVERY-2026-08-11/source-artifacts/original/The General’s Will and Last Testament - Edited Manuscript.docx` | `bd08c013786313782923d869276e8e2c6d16e6fb6446d898f7930527f31596e9` | 115453 | Full-length source evidence, but internal automation header is visible. Not author-facing as-is. |
| `PROGRAM-008-AUTHOR-REVIEW-PREP-2026-08-04/packages/the-generals-will-and-last-testament/the-generals-will-and-last-testament-Author-Review-Manuscript.docx` | `246d722e2a103a1b04fa138edfffbd9b7fcd14ba1ae2cefafc912f8cb0188dba` | 113900 | Author-review candidate. Starts with manuscript text and reaches expected ending. |
| `IYORWUESE-JACKIE-EDITORIAL-DECISION-2026-08-11/editorial-working-version/The General’s Will and Last Testament - Editorial Working Version - Jackie Restoration.docx` | `d1d26531bae4be696150b3db8bbcfa2b8caab6e2d39b7aec34b6c72f11bd3453` | 113900 | Jackie-restored editorial working version. Starts with manuscript text and reaches expected ending. |

## Defect Classification

Original delivery: `DELIVERY_OCCURRED`

Original delivery validity: `FALSE`

Defect reason: `REQUIRED_REVIEW_ARTIFACT_INVALID`

Corrected delivery authority: pending production relay deployment/readback and a single governed corrected send transaction.

Response clock rule: the author response clock must start from the corrected valid delivery, not from the invalid prior delivery.
