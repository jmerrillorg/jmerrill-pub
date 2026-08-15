# Regression Tests

Last verified: 2026-08-15T09:50:00-04:00

## Function Lint

Command:

```bash
npm run lint
```

Directory:

`azure-functions/diagnostic-ai-runner`

Result: PASS

## Focused Runtime / Author Review Suite

Command:

```bash
node --test scripts/program006_publishing_dispatch_service.test.mjs scripts/author_package_notification_engine.test.mjs scripts/author_review_package_engine.test.mjs scripts/author_stage_messaging.test.mjs scripts/author_decision_closeout_propagation.test.mjs scripts/approval_event_consumer.test.mjs azure-functions/diagnostic-ai-runner/test/editorialAuthorGatePolicy.test.js azure-functions/diagnostic-ai-runner/test/editorialExecutionRuntime.test.js azure-functions/diagnostic-ai-runner/test/authorReviewResponseConsumer.test.js
```

Result:

- 149 / 149 PASS

## Root Type Check

Command:

```bash
npm run type-check -- --pretty false
```

Result: PASS

## Notes

Local validation ran under Node 26 and produced expected engine warnings because repository policy declares Node `>=24 <25` and the Function package declares Node `>=22 <25`.

Node runtime drift remains open and was not closed by this pass.
