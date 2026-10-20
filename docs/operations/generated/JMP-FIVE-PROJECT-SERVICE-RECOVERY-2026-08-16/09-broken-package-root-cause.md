# Broken Developmental Package Root Cause

Last verified: 2026-08-17T02:18:20.394Z

Evidence source: founder-verified failed-delivery incidents plus canonical project census.

## Current Finding

The Aug 2 corrected Developmental delivery path produced author-facing files that were labeled delivered but were not proven usable. The read-model evidence cannot certify the root cause by itself because source bytes, generated package bytes, MIME/container records, and transport attachment bytes were not all bound in this evidence pass.

## Required Root-Cause Checks Before Resend

- Source file exists and matches intended title/version.
- Package generator receives the source bytes, not a placeholder or manifest stub.
- MIME/container type matches DOCX/PDF expectations.
- Attachment assembly attaches generated author documents only.
- Email transport preserves delivered bytes.
- DOCX opens/parses with a document parser.
- PDF renders/open-checks when PDF is included.
- Content sanity confirms the title/author and meaningful author-facing content without writing manuscript contents to evidence.

## Broken Developmental Deliveries

| Title | Failed Send Date | Failure Type | Source Recovered | Replacement Certified | Replacement Sent | New Review Clock | Waiting On |
|---|---|---|---|---|---|---|---|
| Before You Were Born | 2026-08-02 | Author explicitly reported file failed to open | SOURCE_EXISTS_NEEDS_BINDING | NO_HELD_PENDING_SOURCE_AND_ATTACHMENT_CERTIFICATION | 0 | NOT_STARTED_FAILED_DELIVERY_SUPERSEDED_ONLY | JMP |
| The Long Watch | 2026-08-02 | Tiny/unreadable/invalid author-facing Developmental package files | SOURCE_EXISTS_NEEDS_BINDING | NO_HELD_PENDING_SOURCE_AND_ATTACHMENT_CERTIFICATION | 0 | NOT_STARTED_FAILED_DELIVERY_SUPERSEDED_ONLY | JMP |
| Establishing Glory: The Library | 2026-08-02 | Tiny/unreadable/invalid author-facing Developmental package files | SOURCE_EXISTS_NEEDS_VERSION_RECONCILIATION | NO_HELD_PENDING_SOURCE_AND_ATTACHMENT_CERTIFICATION | 0 | NOT_STARTED_FAILED_DELIVERY_SUPERSEDED_ONLY | JMP |

Runtime/package certification changes, if required, belong in a separate bounded runtime PR and must not be hidden inside this evidence PR.
