# Reversibility and Idempotency

Last verified: 2026-08-10T09:17:30Z

## Reversibility

Classification: CORRECTABLE.

Rollback/correction path: if later execution registers the wrong baseline, Jackie can mark the internal-review baseline reference superseded or corrected, return the Cover Creative Brief task to In Progress, and preserve the correction in evidence. No external party, money movement, production file, author approval request, or distribution channel is affected.

## Idempotency

| Duplicate risk | Result |
| --- | --- |
| Duplicate creative briefs | PASS |
| Duplicate work items | PASS |
| Duplicate execution events | PASS, provided later execution uses natural key `PILOT1-LIVE-ACTION-003:JMP-INT-202607-0W5PTQ:cover-brief-internal-review-baseline` |
| Duplicate approval requests | PASS |
| Duplicate marketing opportunities | PASS |

Idempotency: PASS.
