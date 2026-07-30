# Agent Inventory

Sources: Jackie directive and Microsoft Azure Copilot documentation reviewed 2026-07-30

| Agent | Release state | Current JM1 decision | Notes |
| --- | --- | --- | --- |
| Azure Copilot chat | General Availability | Preserve current governed setting only if agents can be contained | If agent containment cannot be separated, tenant-level containment takes precedence. |
| Observability Agent | General Availability per Jackie directive; Microsoft agent docs still frame agent access through preview controls | REVIEW PENDING | Candidate for later conditional review due monitoring relevance. Not enabled by this pass. |
| Deployment Agent | Public Preview | DISABLED / NOT APPROVED | Could generate deployment artifacts or actions. Not approved. |
| Troubleshooting Agent | Public Preview | DISABLED / NOT APPROVED | Could inspect and propose changes across operational resources. Not approved. |
| Optimization Agent | Public Preview | DISABLED / NOT APPROVED | Cost/performance recommendations require governance review. Not approved. |
| Resiliency Agent | Public Preview | DISABLED / NOT APPROVED | Architecture-impacting recommendations require governance review. Not approved. |
| Migration Agent | Public Preview | DISABLED / NOT APPROVED | Migration planning/execution is separately governed. Not approved. |

Public Preview agents enabled by Cody: 0
