# Validation Results

Last Verified: 2026-08-11

## Runtime / Read-Model Validations

| Command | Result |
| --- | --- |
| `npm ci` | PASS with Node 26 warning; repository declares Node `>=24 <25` |
| `npm run author-response-runtime-remediation-guard` | PASS - 41 / 41 |
| `npm run author-facing-html-render-enforcement-guard` | PASS - 27 / 27 |
| `node scripts/catalog_portfolio_layer.test.mjs` | PASS |
| `node scripts/production_title_contamination_guard.test.mjs` | PASS |
| `node scripts/publisher_today_read_model.test.mjs` | PASS |
| `node --test scripts/author_payout_enrollment_governance.test.mjs scripts/program002_author_portal_logic.test.mjs scripts/tranche3_title_pf_runtime.test.mjs` | PASS - 26 / 26 |
| `npm run author-auth-guard` | PASS |
| `npm run tranche1-commercial-foundation-guard` | PASS |
| `npm run tranche2-money-fulfillment-guard` | PASS |
| `npm run royalty-import-guard` | PASS |
| `npm run tranche4-author-marketing-experience-guard` | PASS - 10 / 10 |
| `npm run tranche5-post-publication-operations-guard` | PASS - 9 / 9 |
| `npm run tranche6-certification-controlled-thaw-guard` | PASS - 9 / 9 |
| `npm run marketing-reconciliation-guard` | PASS - 6 / 6 |
| `npm run marketing-spend-authorization-guard` | PASS - 8 / 8 |
| `npm run type-check` | PASS |

## Validation Caveats

- Node warning remains because the local environment is Node 26 while the repository declares Node `>=24 <25`.
- `npm ci` reported audit warnings; this run did not authorize dependency remediation.
- Distribution settlement-source reconciliation is blocked pending source documents.
- Jackie notification delivery was not proven through a live configured delivery channel in this run.
