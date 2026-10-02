# Review Cover Note Contract

Last Verified: 2026-09-03T05:22:00Z

## Finding

REVIEW_COVER_NOTE_REQUIRED = YES

REQUIRED_FOR_STAGE = LINE_EDITING_REVIEW / COPYEDITING_REVIEW author package notifications

ATTACHMENT_CLASS = reviewCoverNote

REQUIRED_SOURCE = governed package artifact selected from current author-visible editorial artifacts

REQUIRED_AUTHORITY = deterministic package-context note may be prepared by JMP/Cody when content is fully determined by governed title, stage, package, artifact, and author-review contract evidence. Editorial judgment, author language, or new approval terms require human authority.

REQUIRED_FIELDS = title, author/reviewer salutation, package context, included items, review action, next-step boundary, non-change statement.

REQUIRED_BINDINGS = TITLE_ID a69b9dfa-bb7b-f111-ab0f-7c1e525b15c2; STAGE_ID de969f33-06a0-f111-b8dc-6045bdd69435; PACKAGE_ID pkg-de969f33-06a0-f111-b8dc-6045bdd69435-line-editing-v1; ARTIFACT_ID/VERSION current author-facing reviewCoverNote.

OPTIONAL_OR_REQUIRED = REQUIRED

## Code Evidence

- lib/server/author-package-notification-engine.ts declares LINE_EDITING_REVIEW attachmentsRequired as lineEditedManuscript + reviewCoverNote.
- lib/server/publishing-dispatch-service.ts blocks materialization when a required role is missing.
- azure-functions/diagnostic-ai-runner/src/editorial/editorialCadenceAuthorPackageSender.js mirrors the same role requirement.
