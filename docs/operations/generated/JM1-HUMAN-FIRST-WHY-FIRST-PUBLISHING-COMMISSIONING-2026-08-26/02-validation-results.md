# Validation Results

Last verified: 2026-08-26

## Commands

| Command | Result |
| --- | --- |
| `npm ci` | PASS with Node 26 engine warning against declared Node 24 |
| `node --test scripts/author_communication_brand_guard.test.mjs` | 10 / 10 PASS |
| `node --test scripts/author_review_package_engine.test.mjs` | 27 / 27 PASS |
| `node --test azure-functions/acs-email-relay/test/validation.test.js` | 41 / 41 PASS |
| `node --test scripts/author_facing_html_render_enforcement.test.mjs` | 27 / 27 PASS |
| `node --test scripts/author_package_notification_engine.test.mjs` | PASS |
| `npm run type-check` | PASS |

## Proved Cases

- valid plain professional author message without fixed section headings: PASS;
- internal runtime/package language in author email: DENY;
- wrong Publishing sender identity: DENY;
- truncated author-review manuscript: QA_FAILED;
- filename-only manuscript authority: QA_FAILED;
- invalid original delivery clock: not started;
- corrected valid delivery clock: starts from corrected delivery timestamp.
