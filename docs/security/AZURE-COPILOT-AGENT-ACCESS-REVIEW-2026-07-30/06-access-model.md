# Access Model

## Microsoft Model

Azure Copilot uses the user's existing Azure access model. Microsoft documentation states that Azure Copilot is available to all tenant users by default unless a Global Administrator limits access using Azure RBAC and the Copilot for Azure User role.

## JM1 Recommended Model

Current containment model: RBAC gate enabled with no general-user access

Portal-confirmed state:

- Azure Copilot is not available to all users.
- Azure Copilot RBAC is on.
- Agents preview request is off.
- No permanent Azure Copilot role assignment was created by Cody.

Because no clearly approved Azure administration security group was identified during execution, Cody did not assign Copilot access to any group. This avoids a broad or ambiguous permanent access grant.

Conditional future access:

1. Create or identify an approved Entra security group for Azure Copilot users.
2. Assign Copilot access only to that group.
3. Review each preview or generally available agent before operational use.
4. Preserve user RBAC, PIM, policy, and resource-lock boundaries.
5. Require logging and human approval for any proposed action.

No new group or permanent role assignment was created during this review. Temporary root visibility elevation was used only to satisfy the Azure Portal prerequisite and was removed after containment.
