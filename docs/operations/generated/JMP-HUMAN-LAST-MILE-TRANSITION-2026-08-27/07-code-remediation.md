# Code Remediation

Last Verified: 2026-08-27T10:49:52Z

## Files Modified

- lib/server/author-package-notification-engine.ts
- lib/server/jm1-enterprise-communication-renderer.ts
- azure-functions/diagnostic-ai-runner/src/editorial/editorialCadenceAuthorPackageSender.js
- azure-functions/acs-email-relay/test/validation.test.js
- scripts/author_review_package_engine.test.mjs
- scripts/author_package_notification_engine.test.mjs

## Runtime Enforcement Added

- Added `HUMAN_LAST_MILE_POLICY`.
- Added attachment recipient-surface validation.
- Added manuscript content-profile validation for manuscript attachment roles.
- Added pre-send binary validation in `sendAuthorPackageNotificationViaAcs`.
- Updated author-review notification copy to make email and attachments primary.
- Removed known defective phrases from shared renderer and cadence sender path.

## Guarded Attachment Roles

- editedManuscript
- lineEditedManuscript
- copyeditedManuscript
- proofreadManuscript
