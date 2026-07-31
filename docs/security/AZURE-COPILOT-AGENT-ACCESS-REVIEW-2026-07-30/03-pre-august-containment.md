# Pre-August Containment

## Containment Attempt

The authorized containment control was searched in the Azure Copilot admin center on 2026-07-30. The Access management blade initially did not expose toggle controls and instead displayed the prerequisite that the operator must have access to all Azure subscriptions and management groups in the tenant.

Jackie then authorized completion of the Azure Portal administrative prerequisite. Cody used temporary root-scope Azure visibility elevation for jm1-admin, exposed the Access management controls, removed the Agents preview access request, and turned off tenant-wide Azure Copilot availability.

## Current Containment Classification

Pre-August containment state: COMPLETE
Access model: RBAC gate on; Azure Copilot not available to all users
Public Preview Agents: Disabled/not requested
Production impact: 0
Azure workload resource changes: 0
Permanent permissions granted: 0
Temporary permission elevation: User Access Administrator at /, removed after containment
Agents enabled by Cody: 0

## Final State

- Azure Copilot: governed
- Tenant-wide access: off
- Azure Copilot RBAC: on
- General users: no Azure Copilot access
- Agents preview: off
- Approved Copilot admin group assignment: not created in this pass because no clearly approved Azure-administration security group was identified
- Future admin access: requires a separate governed group or role assignment

## Required Future Jackie Administrator Action

If JM1 wants admin use of Azure Copilot, identify or create an approved Azure administration security group and assign the Azure Copilot user role only after Azure exposes the role cleanly and Jackie approves the access list.
