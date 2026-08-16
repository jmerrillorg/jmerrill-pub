# Email Rendering Certification

Last verified: 2026-08-15

Evidence source:

- `lib/server/prospect-editorial-review-policy.ts`
- `lib/server/author-communication-brand.ts`
- `scripts/author_communication_brand_guard.test.mjs`

Prospect recommendation emails use the shared branded renderer and validate both HTML and plain text.

Validation result:

`npm run author-communication-brand-guard`: 8 / 8 PASS
