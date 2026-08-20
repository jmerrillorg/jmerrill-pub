# Resume and Idempotency

Last Verified: 2026-08-20

## Behaviors Validated

- Existing job replay resumes instead of creating duplicate chunks.
- Completed job replay is a no-op.
- Restart after six completed chunks resumes at chunk seven.
- Completed chunks are not rerun after a chunk-four 429.
- Source checksum drift fails closed.
- Provider fallback is rejected even if a fallback output exists.

## Evidence Source

Focused test run:

`node --test test/asyncLongFormEditorialWorker.test.js test/modelCapacityRetryPolicy.test.js`

Result: `22 / 22 PASS`.

