# Agent Risk Assessment

| Agent | Primary risk | Recommended governance posture |
| --- | --- | --- |
| Observability Agent | Broad operational visibility and log interpretation may surface sensitive operational data. | Review for conditional enablement only after logging, access, and evidence boundaries are approved. |
| Deployment Agent | Can propose deployment artifacts and infrastructure steps that may conflict with governed release controls. | Keep disabled pending explicit deployment governance decision. |
| Troubleshooting Agent | May encourage ad hoc remediation or resource inspection across scope boundaries. | Keep disabled pending support and incident-response procedure. |
| Optimization Agent | Cost or performance advice may conflict with approved architecture or licensing decisions. | Keep disabled pending cost-governance review. |
| Resiliency Agent | Resiliency changes can alter topology, failover, and backup assumptions. | Keep disabled pending architecture review. |
| Migration Agent | Migration recommendations can affect data movement, DNS, and hosting boundaries. | Keep disabled pending migration authorization. |

Overall risk: Default broad access could convert preview capabilities into unreviewed operational tooling. Agent-level approval should be explicit and evidence-backed.

