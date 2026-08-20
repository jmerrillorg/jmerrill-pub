# Validation Results

Last Verified: 2026-08-20

## Dependency Install

Command: `npm ci`

Result: PASS.

Caveat: Node `v26.0.0` emitted `EBADENGINE`; package declares `>=22 <25`.

## Lint

Command: `npm run lint`

Result: PASS.

## Focused Tests

Command:

`node --test test/asyncLongFormEditorialWorker.test.js test/modelCapacityRetryPolicy.test.js`

Result: `22 / 22 PASS`.

## Full Runner Test Sweep

Command: `npm test`

Result: `1976 / 1979 PASS`.

Failures: 3 pre-existing / unrelated agreement mirror tests in `test/agreementGeneratedPackageMirror.test.js`.

- `uploads all four documents under generated-agreements/{diagnosticId}/ and verifies each by hash`
- `the manifest's per-file hashes match the actual uploaded content`
- `liveActions confirms staging-only scope`

No async editorial worker test failed in the full sweep.

## Covered Scenarios

- 10-chunk job completes.
- Chunk 4 429 waits/resumes.
- Chunks 1-3 are not rerun after 429.
- Restart after six chunks resumes at seven.
- Same job replay is idempotent.
- Completed job replay is no-op.
- Out-of-order chunks aggregate in order.
- Invalid provider output fails closed.
- QA failure blocks certification.
- Cancellation preserves completed chunks.
- Prompt/model/source are pinned.
- Source checksum drift fails closed.
- Provider fallback rejected.
- 5,000/60s rate governor enforced.
- Future configured limit supported.
- Operator view avoids manuscript text leakage.
