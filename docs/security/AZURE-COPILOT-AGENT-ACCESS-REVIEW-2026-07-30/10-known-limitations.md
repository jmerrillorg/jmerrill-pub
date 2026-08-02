# Known Limitations

- The Azure Copilot admin center initially hid writable Access management controls until the operator satisfied the all-subscriptions and management-groups prerequisite.
- Temporary root-scope User Access Administrator elevation was required to expose the controls and was removed after containment.
- The portal references an Azure Copilot user role, but Azure CLI role-definition queries did not return a role named Azure Copilot user or Copilot for Azure User. The only Copilot-named role returned was Edge Management Copilot User, which was not used.
- No approved Azure-administration security group was clearly identified during execution, so no permanent Copilot user role assignment was created.
- Azure Portal provides the authoritative state for Azure Copilot availability in this package; CLI evidence validates subscriptions, management-group visibility during elevation, root role cleanup, and absence of Copilot-named assignments where queryable.
- No Dataverse execution event was written because no approved Azure Copilot-specific event type was confirmed during this pass.
