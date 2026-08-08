# Open Holds

Last verified: 2026-08-08T04:34:00Z

| Hold | Status | Required Resolution |
| --- | --- | --- |
| Governed source-controlled solution package | CLOSED | `JM1PublishingSales` baseline is unpacked under `powerplatform/solutions/JM1PublishingSales/src/`. |
| Approved development environment target | CLOSED | JM1-Enterprise-Dev created as Dynamics-capable DEV target; Sales baseline installed; JM1PublishingSales import passed. |
| Production deployment mechanism | OPEN | Deployment identity is commissioned and workflow is patched, but GitHub will not dispatch the workflow until it exists on the default branch. |
| Power Apps / Approvals artifact ownership | OPEN | No solution-aware Tranche 1 operating surface or Approvals artifacts exist yet. |
| Stripe payment projection implementation path | CLOSED FOR PLANNING | Classified `EXTEND_EXISTING`; use existing governed Stripe runtime/webhook path before any custom adapter. |
| Development dependency parity | CLOSED | JM1-Enterprise-Dev import and publish passed after source-boundary repair and prerequisite recovery. |

PR #438 holds: 3 / 5 CLOSED.

Active blocker: `BLOCKED — PROTECTED WORKFLOW NOT DISPATCHABLE UNTIL DEFAULT-BRANCH WORKFLOW EXISTS`.

Tranche 1 runtime implementation: NOT RESUMED.

Client-title automation remains FROZEN.
