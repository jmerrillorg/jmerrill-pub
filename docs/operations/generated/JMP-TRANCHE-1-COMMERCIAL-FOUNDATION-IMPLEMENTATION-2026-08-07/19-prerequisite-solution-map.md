# Prerequisite Solution Map

Last verified: 2026-08-08T03:36:37.099920+00:00

## Governed Prerequisite Solutions

None were imported.

## Proposed Layers

| Layer | Name | Status | Purpose | Evidence |
| --- | --- | --- | --- | --- |
| Microsoft first-party | Dynamics 365 Sales / Core Sales / Lead Management / Product Management | BLOCKED | Provide Lead, Opportunity, Quote, Product, Price List and related Sales tables/components. | PAC app install logs. |
| JM1 shared/foundation | Existing `JM1_EnterpriseFoundation` in JM1-Dev | PRESENT | Existing shared JM1 baseline. | `pac-solution-list-jm1-dev-2026-08-07.log` |
| Publishing prerequisites | None imported | NOT REQUIRED AFTER PRUNING, except possible future recovery of 3 Publishing artifacts if Sales baseline succeeds. | Active-layer reconciliation. |
| Publishing Sales | `JM1PublishingSales` | BLOCKED | Tranche 1 Sales solution. | Pruned import log. |

## Production-Recovered Components

No production Active-layer component was recovered into a new prerequisite solution because dependency pruning removed the need to package most Active-layer drag, and the remaining path was blocked earlier by Microsoft first-party Sales baseline install failure.
