# Preview Environment Cleanup

## Deleted Preview Builds

| Preview | Source branch | PR title | Last status | Action |
| --- | --- | --- | --- | --- |
| `341` | `codex/jm1-infra-005-deployment-reliability` | JM1-INFRA-005 production deployment reliability | Ready | Deleted |
| `349` | `codex/jm1-infra-006-phase2-staging-certification` | GATE-W1 jmerrill.pub App Service reference certification | Ready | Deleted |
| `355` | `codex/gate-w2-enterprise-web-topology-cost` | GATE-W2 enterprise web topology and cost decision package | Ready | Deleted |

After preview deletion, the SWA environment list contained only `default`. The `default` environment was then removed by deleting the SWA resource.

## Capacity Result

SWA preview capacity is no longer a Publishing PR dependency because:

- the workflow is disabled;
- the workflow file is deleted in this branch;
- the SWA resource is deleted;
- App Service staging is the preproduction authority.

