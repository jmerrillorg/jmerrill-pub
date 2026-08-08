# Environment Bindings

Last verified: 2026-08-08T04:34:00Z

## Current Binding State

| Dependency | DEV binding | PROD binding | Secret-bearing? | Deployment behavior |
| --- | --- | --- | --- | --- |
| Dataverse | `https://jm1enterprisedev.crm.dynamics.com/` | `https://jm1hq.crm.dynamics.com/` | No direct secret in solution | Bound by target environment during import. |
| Dynamics 365 Sales | `msdyn_SalesApp` installed in JM1-Enterprise-Dev | Existing production Sales/Dynamics baseline | No direct secret in solution | First-party app must exist before import. |
| SharePoint | Not present in current baseline | Not present in current baseline | Not in solution | Future solution-aware component required before runtime. |
| Exchange/Outlook | Not present in current baseline | Not present in current baseline | Not in solution | No author communications under this PR. |
| Teams/Approvals | Not present in current baseline | Not present in current baseline | Not in solution | Ownership unresolved until exception queue implementation. |
| Power Automate | No flow components in current baseline | No flow components in current baseline | Not in solution | Future flows must be solution-aware. |
| Stripe projection | Existing governed runtime path, not in solution | Existing governed runtime path | Yes, outside repo | Projection path remains `EXTEND_EXISTING`; no Stripe mutation performed. |
| Azure Functions | Existing governed runtime path, not in solution | Existing governed runtime path | Yes, outside repo | No function app setting or secret committed. |

## Open Binding Items

Connection references: none present in current source baseline.

Environment variables: none present in current source baseline.

Power Apps / Approvals ownership: not yet closed; see `30-power-apps-approvals-ownership.md`.
