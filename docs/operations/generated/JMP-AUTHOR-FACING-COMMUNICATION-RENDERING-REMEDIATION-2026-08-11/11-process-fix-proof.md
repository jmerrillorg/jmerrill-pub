# Process Fix Proof

Last Verified: 2026-08-11

Before:

An author-facing review-package payload could bypass the package renderer and still pass ACS relay validation if it had any HTML body and valid attachments.

After:

The relay requires:

- canonical render metadata;
- canonical renderer identity;
- canonical render mode;
- canonical render-template guard result;
- governed section hierarchy;
- styled CTA link;
- plain-text portal fallback;
- no internal language exposure.

This turns the defect from a per-message styling issue into a reusable process guard.

Evidence Source:

- `validateCanonicalAuthorReviewHtmlPayload` in `azure-functions/acs-email-relay/src/functions/sendAuthorAcknowledgment.js`
- `validateAuthorCommunicationRenderContract` in `lib/server/author-communication-brand.ts`

