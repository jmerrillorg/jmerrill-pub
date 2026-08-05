# Test and Certification Plan

Status: FUTURE CRITERIA ONLY
Production/runtime tests run by this package: 0

## Required Test Suites

| Suite | Required coverage | Commissioning gate |
| --- | --- | --- |
| Schema tests | required fields, choices, alternate keys, relationships, security roles, no destructive cascades | All pass before schema promotion. |
| Transition tests | every permitted transition passes; every prohibited transition fails; missing evidence fails; wrong actor fails; duplicate request is idempotent; canon-version mismatch fails | All pass before runtime commissioning. |
| Execution-log tests | every transition emits exact event; prior/resulting state correct; correlation IDs persist; evidence reference required; no generic silent status changes | All pass before any production transition. |
| Author-experience tests | plain-language status; internal PF codes hidden; execution IDs hidden; AI/automation methods hidden; required action accurate; no false overdue/response-clock claims | All pass before author-facing exposure. |
| Migration tests | internal titles only; no state inferred without authority; disputed records fail closed; duplicate PF records rejected | 3 internal rehearsals pass before client title consideration. |

## Production Certification Criteria

- Internal title rehearsals: 3 / 3
- Manual workarounds: 0
- Unauthorized transitions: 0
- Internal content exposure: 0
- Author-facing status defects: 0
- Execution-log gaps: 0

These are future criteria, not current authority to run implementation or production tests.
