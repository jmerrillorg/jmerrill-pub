# Response Correlation

Last verified: 2026-08-15

Evidence source:

- `azure-functions/diagnostic-ai-runner/src/orchestration/authorReviewResponseConsumer.js`
- `azure-functions/diagnostic-ai-runner/test/authorReviewResponseConsumer.test.js`

Validation result:

`npm run author-response-runtime-remediation-guard`: 49 / 49 PASS

Prospect package-selection replies continue through the package-selection consumer and are distinct from active-author gate approvals.
