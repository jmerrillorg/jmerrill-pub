# Runtime Controls

Last Verified: 2026-08-25T10:50:30Z

## Retry / Backoff

The provider retry path now includes:

- governed minimum retry delay;
- governed maximum retry delay;
- exponential/progressive backoff with jitter;
- positive `Retry-After` honoring within the floor/cap;
- `Retry-After: 0` converted to the governed retry floor;
- safe rate-limit metadata capture;
- 429 classification for output-token, uncached-input-token, request, token, and unknown throttles.

## Line Chunk Scheduling

Line editing chunk execution now computes concurrency from:

- configured maximum concurrency;
- deployment TPM;
- observed output bucket ratio;
- headroom ratio;
- line chunk max-output-token ceiling;
- estimated input token reservation.

For the approved 100k TPM target, 8192 max output tokens, 20% output bucket ratio, and 30% headroom, the recommended concurrency is:

`1 active Line chunk at a time`

This is conservative by design. It preserves editorial quality and prevents the prior burst pattern from over-running the output-token bucket.

## Adaptive Throttle Response

When a chunk returns a 429 after provider retries:

1. the failed chunk is not marked complete;
2. already successful chunks are preserved;
3. failed throttled chunks are retried within the bounded adaptive retry policy;
4. concurrency is reduced;
5. no partial manuscript can be marked complete unless all chunks succeed.

