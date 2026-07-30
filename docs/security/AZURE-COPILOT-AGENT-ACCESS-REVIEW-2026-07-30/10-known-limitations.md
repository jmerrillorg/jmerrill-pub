# Known Limitations

- The Azure Copilot admin center did not expose writable Access management controls in the available session.
- The portal displayed a prerequisite requiring access to all Azure subscriptions and management groups in the tenant.
- The review did not elevate access because new permissions were not authorized.
- Azure CLI provider and role-assignment evidence covers visible subscriptions only and does not prove tenant-level Copilot disabled state.
- Management-group enumeration did not complete in the available execution window.
- No Dataverse execution event was written because no approved Azure Copilot-specific event type was confirmed during this pass.

