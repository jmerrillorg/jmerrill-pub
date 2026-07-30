# Access Model

## Microsoft Model

Azure Copilot uses the user's existing Azure access model. Microsoft documentation states that Azure Copilot is available to all tenant users by default unless a Global Administrator limits access using Azure RBAC and the Copilot for Azure User role.

## JM1 Recommended Model

Default: disabled pending review

Conditional future access:

1. Create or identify an approved Entra security group for Azure Copilot users.
2. Assign Copilot access only to that group.
3. Review each preview or generally available agent before operational use.
4. Preserve user RBAC, PIM, policy, and resource-lock boundaries.
5. Require logging and human approval for any proposed action.

No new group, role assignment, or permission was created during this review.

