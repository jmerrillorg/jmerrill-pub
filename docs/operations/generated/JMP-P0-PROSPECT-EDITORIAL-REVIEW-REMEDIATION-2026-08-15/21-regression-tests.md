# Regression Tests

Last verified: 2026-08-15

Evidence source: local test execution.

Passed:

- `npm run type-check`: PASS
- `node --test scripts/p0_prospect_editorial_review_lifecycle_guard.test.mjs`: 7 / 7 PASS
- `node --test scripts/author_facing_editorial_review_package.test.mjs`: 5 / 5 PASS
- `npm run program006-dispatch-guard`: 19 / 19 PASS
- `npm run author-communication-brand-guard`: 8 / 8 PASS
- `npm run author-response-runtime-remediation-guard`: 49 / 49 PASS

Dependency setup:

- Root `npm ci`: PASS with Node 26 engine warning.
- Azure Functions `npm ci`: PASS with Node 26 engine warning.
