# Regression Results

Last Verified: 2026-08-11

Validated:

- `npm ci`: PASS with Node 26 engine warning; repo declares Node >=24 <25.
- `npm run type-check`: PASS
- `npm run author-communication-brand-guard`: PASS, 8 / 8
- `npm run author-facing-html-render-enforcement-guard`: PASS, 26 / 26
- `node --test azure-functions/acs-email-relay/test/validation.test.js`: PASS, 32 / 32
- `node --test scripts/author_review_package_engine.test.mjs scripts/author_package_notification_engine.test.mjs`: PASS, 26 / 26 plus package guard checks
- `npm run human-review-artifact-readiness-guard`: PASS, 22 / 22
- `npm run real-title-pilot-1-preparation-guard`: PASS, 6 / 6
- `npm run tranche4-author-marketing-experience-guard`: PASS, 10 / 10
- `npm run tranche6-certification-controlled-thaw-guard`: PASS, 9 / 9
- `npm run author-decision-propagation-guard`: PASS, 25 / 25
- `npm run artifact-propagation-guard`: PASS, 25 / 25
- `npm run awaiting-state-closure-guard`: PASS, 25 / 25
- `node --test scripts/publisher_today_read_model.test.mjs scripts/publishing_orchestrator.test.mjs scripts/production_title_contamination_guard.test.mjs`: PASS

Evidence Source:

- Local command output in remediation worktree

