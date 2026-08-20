# Durable Functions Evaluation

Last Verified: 2026-08-20

Durable Functions remains a strong fit for the production orchestration layer because the workload requires:

- long-running orchestration;
- checkpointed chunk progress;
- timers for retry-after/backpressure waits;
- restart-safe replay;
- operator-visible job state;
- cancellation controls.

This PR does not introduce a Durable Functions host. It implements the core deterministic worker contract and validation first. A production Durable Functions wrapper can call the same worker contract once durable store and deployment wiring are authorized.

Classification: FITS / NOT YET IMPLEMENTED.

