# Reusable Defect Classification

Last verified: 2026-08-11T08:45:19Z

## Defect Family

`AUTHOR_RESPONSE_CAPTURE_CORRELATION_ACKNOWLEDGEMENT`

## Defects

| Defect | Classification | Evidence |
| --- | --- | --- |
| Inbound response not durably captured | REAL RUNTIME / PROCESS DEFECT | Exact mailbox response found; exact repository/evidence capture not found |
| Manual recovery title coverage gap | REAL COVERAGE DEFECT | PR #431 title excluded from pilot, but response capture should remain available |
| Decision taxonomy drift | REAL RUNTIME POLICY DRIFT | Mailbox consumer lacks `APPROVED_WITH_CORRECTIONS` outcome |
| Acknowledgement policy gap | GOVERNANCE GAP | No automatic acknowledgement authority located |

## Non-Defects

| Item | Classification |
| --- | --- |
| No PR #431 title advancement | CORRECT FAIL-CLOSED BEHAVIOR |
| No author acknowledgement sent | CORRECT UNTIL GOVERNED |
| No automatic Live Action 006 | CORRECT |

