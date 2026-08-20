# Production Readiness

Last Verified: 2026-08-20

## Status

NOT_READY.

## Reason

The worker is implemented and synthetically validated, but was not deployed to production and was not connected to a production durable job store in this pass.

## Required Before General's Will Retry

1. Merge the worker PR.
2. Deploy the approved head through the governed Function App route.
3. Verify production release SHA.
4. Confirm durable store binding for jobs/chunks.
5. Run a synthetic production smoke that proves checkpoint/resume without manuscript text leakage.
6. Only then retry The General's Will existing Line stage against the pinned approved Developmental artifact and checksum.

## Real Title Actions

- General's Will retry: NOT RUN.
- Long Watch retry: NOT RUN.
- Author review gate: NOT CREATED.
- Copy stage: NOT CREATED.

