# Recommended Ruling

Recommended ruling: Azure Copilot tenant governance is complete for the pre-August containment requirement.

Current governed posture:

- Azure Copilot tenant-wide availability is off.
- Azure Copilot RBAC is on.
- No ordinary tenant users have Azure Copilot access through the default tenant setting.
- Public Preview Agents are disabled/not requested.
- No agent is approved for JM1 operational use.
- No permanent Azure permission expansion remains.

Recommended next governed action:

Identify or create an approved JM1 Azure administration security group, then review whether Azure Copilot chat should be made available to that group only. Review the Observability Agent separately before any future agent enablement. Deployment, Troubleshooting, Optimization, Resiliency, Migration, and additional preview agents remain not approved.
