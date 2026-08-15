# 17 - Capacity Readiness

Last verified: 2026-08-15T02:26:18.195Z

| Measure | State |
| --- | --- |
| Queue behavior | Guarded replay scanned portfolio and processed only 2 eligible rows |
| Per-title isolation | Post-guard replay did not touch author-gated Developmental rows |
| Retry isolation | Idempotent replay preserved existing output/blocker records |
| Model capacity | Claude route commissioned for Stage 0/Developmental/Line; Copy/Proof preferred OpenAI route not deployed |
| 50-title readiness | PARTIAL - selector/idempotency ready; author-review send/response and later-stage model integration remain bottlenecks |
