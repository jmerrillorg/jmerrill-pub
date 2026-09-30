# Regression Tests

Last Verified: 2026-08-15T20:44:30.499Z

| Validation | Result |
| --- | --- |
| Root dependency install | PASS (Node 26 warning; repo declares Node 24) |
| Function dependency install | PASS (Node 26 warning; function declares Node >=22 <25) |
| Type-check | PASS |
| Focused author package / response / runtime tests | 124 / 124 PASS |
| Function lint | PASS |
| Root lint | FAILED on pre-existing untouched `app/layout.tsx` custom font warning |

## Focused Test Command

`node --test scripts/program006_publishing_dispatch_service.test.mjs scripts/author_review_package_engine.test.mjs scripts/author_package_notification_engine.test.mjs azure-functions/diagnostic-ai-runner/test/authorReviewResponseConsumer.test.js azure-functions/diagnostic-ai-runner/test/editorialAuthorGatePolicy.test.js azure-functions/diagnostic-ai-runner/test/editorialExecutionRuntime.test.js`

## Regression Protection Added

The tests now cover automatic operational certification after successful dispatch, existing technical-release recovery without resend, idempotent certification behavior, and fail-closed evidence requirements.
