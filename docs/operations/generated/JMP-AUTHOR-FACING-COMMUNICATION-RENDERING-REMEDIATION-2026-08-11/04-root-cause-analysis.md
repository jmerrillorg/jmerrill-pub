# Root Cause Analysis

Last Verified: 2026-08-11

Confirmed root causes:

1. PACKAGE_ENGINE_BYPASS
   The live send path could provide its own HTML body to the ACS relay instead of requiring the shared package notification renderer.

2. COMMUNICATION_TYPE_MAPPING_GAP
   Author-facing review-package communications were not globally mapped to a mandatory render mode at the relay boundary.

3. BRAND_GUARD_SCOPE_GAP
   Existing brand guards validated renderer outputs and package-engine outputs, but the relay accepted manually prepared HTML if it met minimal payload structure.

Rejected root cause:

ACS_CONTENT_TYPE_MISCONFIGURATION is not supported. The ACS relay preserves `htmlBody` into the ACS `content.html` field when supplied.

Evidence Source:

- `lib/server/author-communication-brand.ts`
- `lib/server/author-package-notification-engine.ts`
- `azure-functions/acs-email-relay/src/functions/sendAuthorAcknowledgment.js`
- `azure-functions/acs-email-relay/test/validation.test.js`

