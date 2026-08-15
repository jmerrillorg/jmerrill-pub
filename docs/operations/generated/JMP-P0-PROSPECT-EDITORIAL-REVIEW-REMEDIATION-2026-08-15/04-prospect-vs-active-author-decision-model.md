# Prospect vs Active Author Decision Model

Last verified: 2026-08-15

Evidence source:

- `lib/server/publishing-lifecycle-context.ts`
- `scripts/p0_prospect_editorial_review_lifecycle_guard.test.mjs`

Prospect Editorial Review decision:

- Decision type: `PROSPECT_PACKAGE_SELECTION`
- Waiting state: `PROSPECT_PACKAGE_SELECTION`
- Response consumer: package-selection consumer
- CTA: `Choose My Publishing Path`

Active contracted-author editorial decision:

- Decision type: `EDITORIAL_STAGE_APPROVAL`
- Waiting state: `AWAITING_AUTHOR_RESPONSE`
- Response consumer: author-review response consumer

Invalid combinations fail closed.
