# Portfolio Counts And Boundary

Last Verified: 2026-08-27T00:07:06Z

## Base Scanner Readback

The base controller scanner still surfaces noisy pre-normalization counts:

| Measure | Count |
| --- | ---: |
| Active title records | 361 |
| Active prospects | 8 |
| Active author stewardship records | 56 |
| Auto-executable | 1 |
| Waiting on Author | 10 |
| Waiting on JMP/System before normalization | 244 |
| Unexplained idle before normalization | 2 |

## Normalized Portfolio Readback

The adoption normalization evidence classifies stale/historical/operator rows into governed dispositions:

| Measure | Count |
| --- | ---: |
| Total records | 425 |
| Auto-executable | 4 |
| Queued / already queued | 4 |
| Waiting on Author | 7 |
| Waiting on JMP | 0 |
| Waiting on System | 0 |
| External | 1 |
| Legacy reconciliation | 31 |
| Operator tasks open | 54 |
| Unexplained idle | 0 |

## Boundary

This pass did not mutate hundreds of active rows from scanner output alone. The safe result is:

- current deterministic machine work was not left idle;
- stale/duplicate execution attempts were rejected idempotently;
- true author and Jackie gates were preserved;
- one artifact drift gap remains explicit and unrepaired until exact artifact authority is proven.

