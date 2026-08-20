# Rate Governor

Last Verified: 2026-08-20

## Default

`5,000` estimated output tokens per `60` seconds.

This default follows the observed provider error and is intentionally more conservative than the deployment-level token readback.

## Behavior

- Estimates each chunk's output-token demand before dispatch.
- Refuses dispatch when the rolling window lacks capacity.
- Records actual output tokens after a provider response.
- Allows configurable future limits without code redesign.

## Evidence Source

- `azure-functions/diagnostic-ai-runner/src/editorial/asyncLongFormEditorialWorker.js`
- `azure-functions/diagnostic-ai-runner/test/asyncLongFormEditorialWorker.test.js`

