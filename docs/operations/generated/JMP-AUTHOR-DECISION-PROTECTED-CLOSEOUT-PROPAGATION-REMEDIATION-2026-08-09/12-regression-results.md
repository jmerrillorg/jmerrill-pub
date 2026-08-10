# Regression Results

Last verified: 2026-08-10T02:46:15Z

Guard: `npm run author-decision-propagation-guard`

Result: 25 / 25 PASS.

Required 20-case matrix:

| # | Scenario | Result |
| --- | --- | --- |
| 1 | Approved reply correlates and closes awaiting state | PASS |
| 2 | Approved with corrections correlates but does not grant wrong next stage | PASS |
| 3 | I have questions records decision/state appropriately | PASS |
| 4 | Ambiguous reply -> REVIEW_REQUIRED | PASS |
| 5 | Duplicate reply -> one decision | PASS |
| 6 | Reply for wrong title -> no state change | PASS |
| 7 | Reply for wrong package -> no state change | PASS |
| 8 | Approved artifact registered with checksum | PASS |
| 9 | Wrong artifact checksum -> hold | PASS |
| 10 | Multiple candidate artifacts -> hold | PASS |
| 11 | Awaiting state closes only for matching review request | PASS |
| 12 | Protected closeout reevaluates after evidence propagation | PASS |
| 13 | Closeout surfaces Cover Design as eligible | PASS |
| 14 | No title-state mutation occurs automatically | PASS |
| 15 | No author communication is generated | PASS |
| 16 | No marketing action occurs | PASS |
| 17 | No distribution action occurs | PASS |
| 18 | No financial action occurs | PASS |
| 19 | Retry after transient failure is idempotent | PASS |
| 20 | Duplicate mailbox ingestion remains idempotent | PASS |

