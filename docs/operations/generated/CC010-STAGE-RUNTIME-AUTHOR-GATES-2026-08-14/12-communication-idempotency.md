# Communication Idempotency

Last verified: 2026-08-14

## No Retroactive Spam

This runtime does not send author communications.

It records author-review gate creation as `AUTHOR_REVIEW_GATE_CREATED` and explicitly states that no notification was sent by the runtime.

## Idempotency

Author-review gate creation is idempotent by stage, stage code, deliverable artifact, and checksum. Existing non-superseded gates for the same artifact are reused.

Evidence source:

- `azure-functions/diagnostic-ai-runner/src/editorial/editorialExecutionRuntime.js`
- `azure-functions/diagnostic-ai-runner/src/editorial/editorialAuthorGatePolicy.js`
