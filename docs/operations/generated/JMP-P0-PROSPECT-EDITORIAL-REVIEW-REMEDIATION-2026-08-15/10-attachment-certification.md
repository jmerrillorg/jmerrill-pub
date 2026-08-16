# Attachment Certification

Last verified: 2026-08-15

Evidence source:

- `lib/server/author-package-notification-engine.ts`
- `scripts/p0_prospect_editorial_review_lifecycle_guard.test.mjs`

Certification now checks:

- Base64 decode
- Nonzero size
- Declared size match
- Minimum plausible bytes
- File type signature
- DOCX container/open tests
- PDF signature/EOF/page count
- Expected title when supplied
- PDF text-flow/density guard
- Internal artifact leakage guard

New blocker:

`PDF_TEXT_FLOW_INVALID:SINGLE_LINE_OVERFLOW`
