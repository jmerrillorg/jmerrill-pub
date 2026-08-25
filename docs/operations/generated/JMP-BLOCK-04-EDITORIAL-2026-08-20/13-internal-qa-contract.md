# Internal QA Contract

Last Verified: 2026-08-25

## Rules

- Author-facing release requires work complete.
- Internal QA must pass before author review release.
- AI output requires governed human QA before author-facing release.
- Internal metadata/stage vocabulary must not leak into author-facing artifacts.

## Audit Status

Status: IMPLEMENTED_ENFORCED

Evidence:

- `resolveAuthorReviewRelease`
- `author-facing release blocks before internal QA and raw AI output QA`
- `author-facing release blocks internal metadata leakage`
