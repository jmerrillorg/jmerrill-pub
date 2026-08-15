# Regression Tests

Last verified: 2026-08-15T10:35:00-04:00

## Commands

```bash
npm run type-check -- --pretty false
```

Result: PASS

```bash
(cd azure-functions/diagnostic-ai-runner && npm run lint)
```

Result: PASS

```bash
node --test scripts/program006_publishing_dispatch_service.test.mjs scripts/author_package_notification_engine.test.mjs scripts/author_review_package_engine.test.mjs scripts/author_stage_messaging.test.mjs scripts/author_decision_closeout_propagation.test.mjs scripts/approval_event_consumer.test.mjs azure-functions/diagnostic-ai-runner/test/editorialAuthorGatePolicy.test.js azure-functions/diagnostic-ai-runner/test/editorialExecutionRuntime.test.js azure-functions/diagnostic-ai-runner/test/authorReviewResponseConsumer.test.js
```

Result: PASS, 150 / 150

## Coverage

The focused tests prove:

- `Untitled` does not create `TITLE_NOT_FINAL_FOR_AUTHOR_REVIEW`;
- the dispatch service reports `titleReadiness`;
- unresolved author-facing identity still blocks;
- internal/non-materialized author-facing attachments still block;
- exactly three distinct suggestions are required;
- suggestions do not become canonical automatically;
- author can provide, select, or keep `Untitled`;
- final-title downstream gates fail closed;
- title task idempotency is stable for the same source artifact and checksum.
