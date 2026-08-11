# Manual Recovery Coverage Analysis

Last verified: 2026-08-11T08:45:19Z

## Current Manual Recovery Status

`The General's Will and Last Testament` remains excluded from Pilot 1 and remains a PR #431 manual-operations title.

Evidence: `docs/operations/generated/JMP-REAL-TITLE-PILOT-SELECTION-2026-08-09/03-pr431-exclusion-review.md:6`

## Coverage Finding

Manual recovery status should prevent automatic production movement. It should not prevent inbound author responses from being captured as governed evidence.

The current evidence suggests a coverage gap:

| Capability | Expected for PR #431/manual title | Observed |
| --- | --- | --- |
| Real author response receipt | Captured | Mailbox only |
| Author identity correlation | Captured | Can be proven, not persisted |
| Title/stage/gate/package correlation | Captured | Can be proven from thread, not persisted |
| Decision classification | Captured as `APPROVED_WITH_CORRECTIONS` | Not persisted |
| Production advancement | Held unless separately authorized | Held |

## Governance Boundary

The correct remediation is not to advance the title automatically. The correct remediation is to make author response capture and correlation durable while leaving PR #431 production state under manual authority.

