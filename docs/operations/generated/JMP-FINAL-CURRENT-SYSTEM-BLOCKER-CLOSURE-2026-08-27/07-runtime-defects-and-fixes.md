# Runtime Defects and Fixes

Last Verified: 2026-08-27T01:50:00Z

## ACS Relay Signature Guard

File:

- azure-functions/acs-email-relay/src/functions/sendAuthorAcknowledgment.js

Defect:

- The author-review package duplicate-signature guard counted the HTML and plain-text bodies together.
- A valid payload with one canonical footer in HTML and one canonical footer in text could be rejected as AUTHOR_REVIEW_PACKAGE_DUPLICATE_SIGNATURE_BLOCKED.

Fix:

- Count canonical Publishing footers separately in each body alternative.
- Reject only when HTML has more than one footer or text has more than one footer.

Regression protection:

- azure-functions/acs-email-relay/test/validation.test.js
- Test: author-review package permits one canonical signature in html and text alternatives.

## Diagnostic Runner Cadence Anchor

File:

- azure-functions/diagnostic-ai-runner/src/editorial/editorialCadenceReleaseConsumer.js

Defect:

- latestPackageCompletionLog selected the newest completion log for a stage.
- A repeated handoff/metadata refresh for the same package could restart an existing cadence hold.

Fix:

- Exclude checksum repair and metadata-refresh rows.
- Determine the current package ID.
- Select the earliest completion log for that current package ID.

Regression protection:

- azure-functions/diagnostic-ai-runner/test/editorialCadenceReleaseConsumer.test.js
- Test: repeated package handoff for same output does not restart cadence hold.

## Design Boundary

No new architecture was introduced. Existing canonical relay and cadence routes were repaired and redeployed.
