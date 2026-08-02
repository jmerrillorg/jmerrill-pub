# Azure Copilot Agent Access Review

Review date: 2026-07-30
Tenant: 352d075e-8e17-4169-9f8e-22e6946ce66d
Execution mode: Authorized tenant containment with temporary Azure root visibility elevation

## Decision

Status: COMPLETE - TENANT GOVERNANCE CONTAINED

The Azure Copilot admin center was reachable for jm1-admin@jmerrill.one in the J Merrill Foundation, Inc. tenant. Jackie authorized completion of the Azure Portal administrative prerequisite. Cody temporarily elevated Azure root visibility for jm1-admin, exposed the Azure Copilot Access management controls, removed the Agents preview access request, and turned off tenant-wide Azure Copilot availability.

Final observed state:

- Azure Copilot is not available to all users.
- Azure Copilot RBAC is on.
- No Azure Copilot user role assignments were found through CLI role-assignment readback.
- Agents preview request is off.
- No Azure Copilot preview agent was enabled.
- No production Azure workload resource was modified.
- Temporary root-scope User Access Administrator elevation was removed.

The portal references an "Azure Copilot user role," but the CLI role-definition query did not expose a role named Azure Copilot user or Copilot for Azure User. Because no approved Azure-administration security group was clearly present, Cody did not create or assign a permanent Copilot access group. This leaves the tenant in a stricter governed state: general users have no Azure Copilot access, and future admin access requires an explicit governed group or role-assignment decision.

## Temporary Elevation Record

Approval: Jackie directive, Complete Azure Copilot Tenant Containment
Operator: jm1-admin@jmerrill.one
Temporary role: User Access Administrator
Scope: /
Assignment ID: d7568700-41b3-48a2-bbc0-bdfaa024fb7b
Elevation began: 2026-07-31T01:24:39Z
Removal completed: 2026-07-31T01:28:15Z to 2026-07-31T01:28:18Z
Post-removal readback: no root-scope role assignment returned for jm1-admin

## Recommendation

Azure Copilot is governed and contained. Public-preview Agents remain disabled/not approved for JM1 operational use.

Future access should be handled as a separate governed action:

1. create or identify an approved JM1 Azure administration security group;
2. assign only the documented Azure Copilot user role when Azure exposes that role cleanly;
3. keep Agents preview disabled unless Jackie approves an agent-specific pilot; and
4. re-verify no general-user access after any Microsoft platform change.
