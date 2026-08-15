# 20 - Runtime Durability

Last verified: 2026-08-15T13:03:48.566486Z

- Node 24 standard drift remains visible: Function App reports Node 22; repository function package declares Node >=22 <25. `RUNTIME_VERSION_DRIFT_OPEN` remains open.
- Production app SHA aligned to canonical main: YES.
- Function app SHA aligned to canonical main: YES.
- Function app routes indexed: 27.
- Response consumer admin replay: processed 0; idempotent 0.
- Editorial runtime admin replay: processed 1; executor count 6.
- Runtime replay blocker preserved: `EDITORIAL_REVIEW_BLOCKED — SOURCE_ARTIFACT_MISSING`.
