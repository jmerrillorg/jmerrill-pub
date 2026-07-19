# JM1 Production Runtime Ownership, Automation, and Usage Audit

## Executive Finding

Publisher Today was conflating business stage ownership, action ownership, and runtime execution ownership. That caused routine active editorial cards and operational exception cards to display `CODY` even when the actual state was author waiting, publisher decision, deployed read-model refresh, or a defined Cody-assisted bridge.

The remediation separates these fields:

- Business Stage
- Current Activity
- Execution Mode
- Execution State
- Business Owner
- Execution Owner
- Awaiting
- Last Trigger
- Last Execution
- Expected Duration
- Exact Blocker
- Next Action

## Corrected Ownership Doctrine

Cody may appear only as:

- `CODY_ASSISTED_BRIDGE` when a business capability is active but still needs interactive Cody execution because the permanent runtime is not commissioned.
- `CODY_ENGINEERING_ONLY` when implementation, deployment, or exception remediation is required.

Cody is not the default owner for routine publishing movement.

## Active Title Findings

| Title | Business stage | Execution mode | Execution state | Business owner | Execution owner | Awaiting | Cost category |
|---|---|---|---|---|---|---|---|
| The Intentional Leader | Proofreading — Author Review | EXTERNAL_PARTY | WAITING_FOR_EXTERNAL_PARTY | Author | Author | Author proofreading response | No variable model cost |
| Before You Were Born | Developmental Editing — In Progress | CODY_ASSISTED_BRIDGE | EXECUTING | Publisher | Cody Bridge | Bridge execution | Codex interactive/model |
| The General's Will and Last Testament | Developmental Editing — In Progress | CODY_ASSISTED_BRIDGE | EXECUTING | Publisher | Cody Bridge | Bridge execution | Codex interactive/model |
| The Long Watch | Editorial Review | CODY_ASSISTED_BRIDGE | QUEUED | Publisher | Cody Bridge | Bridge execution | Codex interactive/model |

## Process Classification Summary

| Process | Primary execution mode | Runtime status | Cost category |
|---|---|---|---|
| Editorial Review | CODY_ASSISTED_BRIDGE | Bridge required | Codex interactive/model |
| Developmental Editing | CODY_ASSISTED_BRIDGE | Bridge required | Codex interactive/model |
| Line Editing | CODY_ASSISTED_BRIDGE | Bridge required | Codex interactive/model |
| Copyediting | CODY_ASSISTED_BRIDGE | Bridge required | Codex interactive/model |
| Proofreading | CODY_ASSISTED_BRIDGE | Bridge required | Codex interactive/model |
| Internal QA | CODY_ASSISTED_BRIDGE | Bridge required | Codex interactive/model |
| Package generation | CODY_ASSISTED_BRIDGE | Bridge required | Codex interactive/model |
| Package release | SYSTEM_ACTION_MANUALLY_TRIGGERED | Deployed bounded action | Azure compute |
| Author review response | EXTERNAL_PARTY | Author/email boundary | No variable model cost |
| Cover Creative Brief | SYSTEM_ACTION_MANUALLY_TRIGGERED | Deployed bounded action | Dataverse/API |
| Cover Concept Development | CODY_ASSISTED_BRIDGE | Bridge required | Codex interactive/model |
| Interior Layout | SYSTEM_ACTION_MANUALLY_TRIGGERED | Readiness/action path exists | Dataverse/API |
| Production QA | NOT_IMPLEMENTED | Capability gap | Unknown |
| Distribution readiness | NOT_IMPLEMENTED | Capability gap | Unknown |
| Royalty ingestion | SYSTEM_ACTION_MANUALLY_TRIGGERED | Deployed import route | Azure compute |
| Royalty normalization | SYSTEM_ACTION_MANUALLY_TRIGGERED | Deployed import route | Azure compute |
| Royalty decision processing | PUBLISHER_MANUAL | Publisher decision queue | Dataverse/API |
| Royalty statement generation | SYSTEM_ACTION_MANUALLY_TRIGGERED | Draft refresh path | Dataverse/API |
| Publisher Today refresh | AUTOMATIC_SCHEDULED | Read model | Dataverse/API |
| Execution exception remediation | CODY_ENGINEERING_ONLY | Engineering-only remediation | Codex interactive/model |
| Author Workspace refresh | AUTOMATIC_EVENT_DRIVEN | Read model | Dataverse/API |
| SharePoint stage synchronization | SYSTEM_ACTION_MANUALLY_TRIGGERED | Partially commissioned sync path | Dataverse/API |

The machine-readable detail is stored at `data/publisher-runtime-ownership/process-inventory.json`.

## Corrections Applied

- Added execution-mode and execution-state fields to Publisher Operating Center workload, intake, portfolio, production, author-response, royalty, alert, and movement read models.
- Replaced routine default `Cody` ownership with explicit `JM1 Automation`, `Publisher`, `Author`, `External`, `Engineering`, or `Cody Bridge`.
- Corrected readiness-guard exceptions to show engineering remediation rather than routine Cody work.
- Corrected active portfolio read-model items to show `JM1 Automation` unless a publisher reconciliation decision is actually required.
- Updated Publisher Today and Master Workload UI to display execution owner, execution state, runtime, awaiting party, and exact blocker.

## Automation Gaps

The following capabilities still require bridge work before they can become production runtimes:

- Editorial Review end-to-end execution
- Developmental Editing execution
- Line Editing execution
- Copyediting execution
- Proofreading execution
- Internal QA execution
- Package generation
- Cover concept generation/development

The following capabilities are not yet implemented as verified production runtimes:

- Production QA
- Distribution readiness

## Usage Boundary

Jackie incurs Codex interactive/model usage when Cody is asked to perform bridge execution, engineering implementation, deployment, remediation, or exception analysis. Deployed Publisher Operating Center read models, Author Workspace refreshes, royalty import routes, and bounded Dataverse/API actions do not use Cody as their runtime.

## Final Boundary

Cody is the engineering, deployment, and exception-remediation executor, not JM1's default production runtime. Routine publishing work must execute through a verified governed runtime when its trigger and prerequisites are present. Any process that still requires a new Cody instruction is explicitly classified as a Cody-assisted bridge, with its usage category, automation gap, and exact operating boundary disclosed.
