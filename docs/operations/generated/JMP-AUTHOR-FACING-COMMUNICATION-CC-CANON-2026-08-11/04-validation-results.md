# Validation Results

Last verified: 2026-08-11T22:20:00Z

| Validation | Result |
|---|---|
| `npm run author-facing-email-cc-canon-guard` | PASS - 14 / 14 |
| `npm run author-facing-html-render-enforcement-guard` | PASS - 27 / 27 |
| `node --test azure-functions/acs-email-relay/test/validation.test.js azure-functions/acs-email-relay/test/sendAgreementPackage.test.js` | PASS - 50 / 50 |
| `node scripts/publishing_email_canon.test.mjs` | PASS - 6 / 6 |
| `node --test scripts/author_facing_html_render_enforcement.test.mjs scripts/author_package_notification_engine.test.mjs scripts/author_review_package_engine.test.mjs` | PASS - 53 / 53 |
| `npm run type-check` | PASS |

Validation note:

Node version warning remains environmental where Node 26 is used against a repository-declared Node `>=24 <25`. The validation commands completed successfully.

