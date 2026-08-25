# Runtime Binding

## Reusable Engine

`lib/server/editorial-cadence-engine.ts` contains:

- canonical stage baseline configuration
- word-count band calculation
- book-type multipliers
- complexity scoring and authority validation
- combined multiplier cap and baseline floor
- rush calculation
- business-day, timezone, after-hours, weekend, and holiday handling
- 24-hour rhythm boundary
- rhythm override handling
- hold boundary precedence
- cadence supersession lineage
- persistence payload construction
- scheduled eligibility evaluation

## Author-Response Consumer Integration

`azure-functions/diagnostic-ai-runner/src/orchestration/authorReviewResponseConsumer.js` now evaluates cadence after a classified author response is persisted.

Approval:

```text
AUTHOR_RESPONSE_CAPTURED
-> AUTHOR_APPROVAL_PERSISTED
-> AUTHOR_RESPONSE_CADENCE_RESTARTED
-> AUTHOR_INBOUND_MESSAGE_COMPLETED
```

Changes requested:

```text
AUTHOR_RESPONSE_CAPTURED
-> AUTHOR_CHANGES_REQUESTED
-> AUTHOR_RESPONSE_CADENCE_RESTARTED
-> AUTHOR_INBOUND_MESSAGE_COMPLETED
```

Question-only or ambiguous responses do not restart cadence.

## Fail-Closed Evidence

If canonical calculation evidence is incomplete, the consumer records:

```text
AUTHOR_RESPONSE_CADENCE_RESTART_BLOCKED
```

This preserves the author response and the gate classification while preventing unsupported cadence scheduling.

## Execution Boundary

The consumer still records:

```text
productionProgression=0
workerExecutionAuthorized=0
```

No transition handler is called by the cadence restart path.
