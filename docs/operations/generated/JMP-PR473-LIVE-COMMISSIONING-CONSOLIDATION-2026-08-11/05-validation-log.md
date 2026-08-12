# Validation Log

Validation is accumulated across PR #473.

## Final Validation After Consolidation Fixes

| Check | Result |
| --- | --- |
| `npm ci --no-audit --fund=false` | PASS; Node v26 engine warning documented |
| `npm run type-check` | PASS |
| `npm run build` | PASS; existing font warning and Dataverse static-generation config warnings documented |
| `git diff --check` | PASS |
| `npm run pr473-commissioning-consolidation-guard` | PASS, 4 / 4 |
| `node --test scripts/publishing_title_closeout_service.test.mjs` | PASS, 18 / 18 |
| `node --test scripts/publisher_today_read_model.test.mjs scripts/publishing_intake_orchestration_autostart.test.mjs` | PASS |
| `npm run author-facing-email-cc-canon-guard` | PASS, 14 / 14 |
| `npm run author-facing-html-render-enforcement-guard` | PASS, 27 / 27 |
| `node scripts/publishing_email_canon.test.mjs` | PASS, 6 / 6 |
| ACS relay tests | PASS, 50 / 50 |
| `npm run author-response-runtime-remediation-guard` | PASS, 41 / 41 |
| `npm run author-decision-propagation-guard` | PASS, 27 / 27 |
| `node --test scripts/author_final_approval_gate.test.mjs scripts/author_review_package_engine.test.mjs scripts/author_package_notification_engine.test.mjs` | PASS |
| `npm run program005-pipeline-guard` | PASS |
| `npm run program006-dispatch-guard` | PASS, 14 / 14 |
| `npm run workflow-engine-guard` | PASS |
| `npm run tranche1-commercial-foundation-guard` | PASS, 5 / 5 |
| `npm run tranche2-money-fulfillment-guard` | PASS, 9 / 9 |
| `npm run tranche3-title-pf-runtime-guard` | PASS, 10 / 10 |
| `npm run tranche4-author-marketing-experience-guard` | PASS, 10 / 10 |
| `npm run tranche5-post-publication-operations-guard` | PASS, 9 / 9 |
| `npm run tranche6-certification-controlled-thaw-guard` | PASS, 9 / 9 |
| `npm run marketing-reconciliation-guard` | PASS, 6 / 6 |
| `npm run marketing-spend-authorization-guard` | PASS, 8 / 8 |
| `npm run royalty-import-guard` | PASS |

Node caveat: local validation is running under Node v26 even though the repository declares Node 24. This is documented and does not hide failures.
