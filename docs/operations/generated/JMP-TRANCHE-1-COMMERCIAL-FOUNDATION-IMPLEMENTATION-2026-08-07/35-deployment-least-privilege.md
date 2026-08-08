# Deployment Least Privilege

Last verified: 2026-08-08T05:12:00Z

## Result

Least-privilege commissioning state: VERIFIED FOR INITIAL ROLE SELECTION / PRODUCTION IMPORT NOT YET PROVEN.

## Role Review

| Capability | Role / Right | Classification | Notes |
| --- | --- | --- | --- |
| Authenticate to Power Platform | GitHub OIDC federated app identity | REQUIRED | Secretless; no Jackie interactive identity. |
| Import/update JM1PublishingSales | Dataverse `System Customizer` | REQUIRED FOR FIRST PROOF | Selected as least-broad plausible role for solution import and publish. |
| Publish required solution changes | Dataverse `System Customizer` | REQUIRED FOR FIRST PROOF | Must be validated by protected workflow. |
| Read deployment result | Dataverse `System Customizer` | REQUIRED | Readback included in workflow. |
| Post-import component readback | Dataverse `System Customizer` | REQUIRED | Readback included in workflow. |
| Dataverse `System Administrator` | Not assigned | TEMPORARY_FOR_COMMISSIONING IF REQUIRED | Only acceptable if `System Customizer` fails the protected import; must be removed after commissioning proof. |
| Global Administrator | Not assigned | NOT_REQUIRED | Not needed for solution import. |
| Broad tenant admin | Not assigned | NOT_REQUIRED | Not needed for solution import. |

## Evidence

- `prod-deployment-role-candidates-2026-08-08.json`
- `assign-prod-deployment-appuser-system-customizer-headers-2026-08-08.log`
- `prod-deployment-appuser-role-readback-2026-08-08.json`

No temporary broad role was assigned in this pass.
