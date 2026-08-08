# Deployment Least Privilege

Last verified: 2026-08-08T08:13:46Z

## Result

Least-privilege commissioning state: PROVEN FOR PROTECTED PRODUCTION IMPORT.

## Role Review

| Capability | Role / Right | Classification | Notes |
| --- | --- | --- | --- |
| Authenticate to Power Platform | GitHub OIDC federated app identity | REQUIRED | Secretless; no Jackie interactive identity. |
| Import/update JM1PublishingSales | Dataverse `System Customizer` | PROVEN REQUIRED/SUFFICIENT FOR THIS PROOF | Protected production import passed. |
| Publish required solution changes | Dataverse `System Customizer` | PROVEN REQUIRED/SUFFICIENT FOR THIS PROOF | Publish all customizations passed. |
| Read deployment result | Dataverse `System Customizer` | PROVEN REQUIRED/SUFFICIENT FOR THIS PROOF | Readback passed. |
| Post-import component readback | Dataverse `System Customizer` | PROVEN REQUIRED/SUFFICIENT FOR THIS PROOF | `JM1PublishingSales` read back from JM1-Core. |
| Dataverse `System Administrator` | Not assigned | NOT_REQUIRED_FOR_THIS_PROOF | No escalation was required. |
| Global Administrator | Not assigned | NOT_REQUIRED | Not needed for solution import. |
| Broad tenant admin | Not assigned | NOT_REQUIRED | Not needed for solution import. |

## Evidence

- `prod-deployment-role-candidates-2026-08-08.json`
- `assign-prod-deployment-appuser-system-customizer-headers-2026-08-08.log`
- `prod-deployment-appuser-role-readback-2026-08-08.json`
- `github-run-31247571393-production-log-2026-08-08.log`

No temporary broad role was assigned in this pass.
