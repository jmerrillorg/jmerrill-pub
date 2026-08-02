# PROGRAM-006 Binary and Link Validation Remediation

Generated: 2026-08-02

## Code Remediation

Updated files:

- app/api/publishing/dispatch/author-package/certify/route.ts
- lib/server/author-communication-brand.ts
- lib/server/author-package-notification-engine.ts
- lib/server/publishing-dispatch-service.ts
- scripts/author_communication_brand_guard.test.mjs
- scripts/author_review_package_engine.test.mjs
- scripts/program006_publishing_dispatch_service.test.mjs

## Active Guards Added

Attachment binary validation:

- validates base64 decoding;
- validates byte length and declared-size consistency;
- rejects 0-byte and implausibly small files;
- requires DOCX ZIP signature;
- requires OOXML parts: [Content_Types].xml, _rels/.rels, word/document.xml;
- rejects JSON/HTML/error payloads masquerading as documents;
- requires PDF signature and EOF marker;
- validates text, JSON, Markdown, and plain text as non-empty author-safe payloads;
- blocks unsupported attachment file types.

Delivery link validation:

- primary action URL is required;
- URL must be HTTPS;
- URL must target jmerrill.pub;
- HTML button must be a clickable anchor, not a styled span;
- plain-text body must include the action URL.

Subject validation:

- rejects duplicated adjacent words for Review, Package, and Corrected.

Exact inventory:

- author package emails now receive package inventory from the validated attachment filenames.

Operational certification:

- certification endpoint now requires attachment byte length, file signatures, open tests, expected content, source checksum lineage, delivered attachment inventory, delivered button URL, author click-through, and response form evidence in addition to the earlier branded HTML, plain text, archive, portal, package visibility, response controls, and single-gate evidence.

## Validation

Local validation completed:

- node --test scripts/author_communication_brand_guard.test.mjs scripts/author_review_package_engine.test.mjs scripts/program006_publishing_dispatch_service.test.mjs: PASS
- npm run type-check: PASS
- npm run lint: PASS with known app/layout.tsx font warning
- npm run program006-dispatch-guard: PASS
- npm run build: PASS with known app/layout.tsx font warning and existing Dataverse catalog configuration warning during static generation
- git diff --check: PASS
- changed-file secret scan: 0 hits

## Boundary

This package records code remediation and incident classification only.

It does not certify a replacement author delivery.

It does not start a new response clock.

It does not mark Before You Were Born Awaiting Author Response.

Replacement delivery remains blocked until the patched worker is deployed and the replacement package passes end-user usability certification.

