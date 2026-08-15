# Title Suggestion Generation

Last verified: 2026-08-15T10:35:00-04:00

## Route

Source: `lib/server/working-title-policy.ts`

When an Editorial Review boundary has no final title, the title suggestion request is built from governed editorial context:

- stage code: `EDITORIAL_REVIEW`
- transaction: `editorial_diagnostic`
- preferred model family: `CLAUDE`
- fallback allowed: `false`
- prompt version: `JM1_TITLE_SUGGESTIONS_V1`
- required suggestion count: `3`

## Source Context

The request supports manuscript/editorial context fields:

- manuscript theme
- central subject
- intended audience
- tone
- genre
- Stage 0 diagnostic summary
- author voice
- recurring concepts

## Guardrails

- exactly 3 distinct suggestions are required;
- suggestions are advisory and author-facing;
- suggestions are not automatically canonical;
- replay reuses the same task identity for the same title, gate, source artifact, and source checksum.

No live suggestions were sent for Atta in this pass because the review artifact remains internal-only and no author-facing package was dispatched.
