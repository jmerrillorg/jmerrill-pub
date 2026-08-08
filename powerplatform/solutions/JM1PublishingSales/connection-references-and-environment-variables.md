# Connection References and Environment Variables

Status: INVENTORIED / IMPLEMENTATION BINDINGS PENDING

| Dependency | Connection reference | Environment variable | DEV binding | PROD binding | Secret? | Secret location | Deployment behavior |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dataverse | Required for D365/Dataverse solution components | None in baseline | JM1-Enterprise-Dev | JM1-Core | No direct secret in solution | Governed identity / environment connection | Solution import and runtime connection must bind per environment. |
| Dynamics 365 Sales | Through Dataverse/Sales components | None in baseline | JM1-Enterprise-Dev Sales baseline installed | JM1-Core | No direct secret in solution | Microsoft first-party app install/licensing | Sales components must exist before import. |
| SharePoint | Required for agreement/artifact references if implemented as flow/app | Not present in baseline | Pending | Pending | Connection may require secret/token outside repo | Governed connector binding | Must be solution-aware before deployment. |
| Outlook/Exchange | Optional activity/reminder integration | Not present in baseline | Pending | Pending | Connection may require secret/token outside repo | Governed connector binding | No author communications under Tranche 1. |
| Teams/Approvals | Required for exception queue if implemented through Approvals | Not present in baseline | Pending | Pending | Connection may require service/user identity | Governed connector binding | Must record approver identity and audit path. |
| Stripe | No Power Platform connector in baseline | Existing runtime/config outside solution | Pending proof | Existing governed Stripe runtime | Yes | Existing secret store, not repo | Stripe projection path is `EXTEND_EXISTING`, using existing governed webhook/runtime before any custom adapter. |
| Azure Functions | Existing agreement/Stripe runtime dependencies | Existing function settings, not in solution | Pending proof | Existing governed runtime | Yes | Azure app settings / Key Vault | Do not commit secrets or function app settings. |
