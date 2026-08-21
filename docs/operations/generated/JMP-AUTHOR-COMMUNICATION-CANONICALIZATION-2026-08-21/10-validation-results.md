# Validation Results

Last Verified: 2026-08-21T08:18:00Z

| Check | Result |
|---|---|
| `npm test` in `azure-functions/acs-email-relay` | 55 / 55 PASS |
| `npm run lint --prefix azure-functions/acs-email-relay` | PASS |
| `npm run type-check` | PASS |
| `node --test scripts/author_facing_email_cc_canon.test.mjs scripts/author_facing_html_render_enforcement.test.mjs scripts/email_header_policy.test.mjs scripts/program006_publishing_dispatch_service.test.mjs` | 61 / 61 PASS |

## Environment Caveat

Root `npm ci` reported the known Node engine warning because the repo declares Node `>=24 <25` and the local runtime was Node `v26.0.0`. Checks still completed successfully after lockfile install.

