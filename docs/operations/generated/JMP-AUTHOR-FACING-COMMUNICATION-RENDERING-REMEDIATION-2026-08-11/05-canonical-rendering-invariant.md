# Canonical Rendering Invariant

Last Verified: 2026-08-11

Invariant:

AUTHOR_FACING + EMAIL = CANONICAL_JMP_HTML_RENDERER_REQUIRED unless explicit PLAIN_TEXT_AUTHORIZED.

Implementation:

- `RenderedAuthorCommunication.metadata.renderMode = CANONICAL_HTML`
- `RenderedAuthorCommunication.metadata.renderTemplateGuard = PASS`
- `RenderedAuthorCommunication.metadata.renderer = JM1 Enterprise Communication Renderer`
- `validateAuthorCommunicationRenderContract` separates brand language, leakage, and render-template enforcement.
- The ACS author-review package relay now requires canonical render metadata and canonical HTML structure before send construction.

Evidence Source:

- `lib/server/author-communication-brand.ts`
- `azure-functions/acs-email-relay/src/functions/sendAuthorAcknowledgment.js`

