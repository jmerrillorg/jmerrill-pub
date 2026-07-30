# Pre-August Containment

## Containment Attempt

The authorized containment control was searched in the Azure Copilot admin center on 2026-07-30. The Access management blade did not expose toggle controls in the available session and instead displayed the prerequisite that the operator must have access to all Azure subscriptions and management groups in the tenant.

No tenant setting was changed.

## Current Containment Classification

Pre-August containment state: PARTIAL  
Reason: tenant-level control unavailable without satisfying a portal access prerequisite  
Production impact: 0  
Azure resource changes: 0  
New permissions granted: 0  
Agents enabled by Cody: 0

## Required Jackie Administrator Action

Use a tenant administrator account or approved process with access to all Azure subscriptions and management groups in the tenant. In the Azure Copilot admin center, complete one of the following before August 1, 2026:

- Disable Azure Copilot tenant access pending individual agent review; or
- Enable role-based access control for Azure Copilot and assign only an approved Azure Copilot user group, then verify Agents preview remains off or separately governed.

Do not enable public-preview agents during this containment action.

