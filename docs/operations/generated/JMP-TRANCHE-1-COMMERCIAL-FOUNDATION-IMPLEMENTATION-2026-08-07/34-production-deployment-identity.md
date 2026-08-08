# Production Deployment Identity

Last verified: 2026-08-08T05:12:00Z

## Result

Production deployment identity: COMMISSIONED.

## Identity

| Field | Value |
| --- | --- |
| Identity name | `jm1-pub-github-actions-oidc` |
| Identity type | Microsoft Entra application / service principal with GitHub OIDC federation |
| Application ID | `97891ed1-6623-487c-b890-633bea440e22` |
| Application object ID | `3c9a6958-fa15-4beb-a0db-3e913019e103` |
| Service principal object ID | `d2b5709c-187a-44b4-a57a-132e2a2c1bfd` |
| Tenant ID | `352d075e-8e17-4169-9f8e-22e6946ce66d` |
| Intended scope | JM1PublishingSales governed Power Platform deployment to JM1-Core |
| JM1-Core app user ID | `761a6aee-e692-f111-8077-000d3a14673b` |
| JM1-Core role | `System Customizer` |
| Authentication method | GitHub Actions OIDC / PAC `--githubFederated` |
| Secretless | YES |
| GitHub environment | `jm1-power-platform-production` |
| Production environment protection | Branch policy restricted to `codex/tranche1-commercial-foundation-implementation-20260807` |
| Owner | JM1 governed deployment identity |
| Recovery / rotation authority | Jackie Smith, Jr. / JM1 Governance Authority |

## Evidence

- `azure-oidc-federated-credential-create-2026-08-08.json`
- `azure-oidc-federated-credential-readback-2026-08-08.json`
- `github-power-platform-production-environment-readback-2026-08-08.json`
- `create-prod-deployment-appuser-headers-2026-08-08.log`
- `prod-deployment-appuser-final-readback-2026-08-08.json`
- `prod-deployment-appuser-role-readback-2026-08-08.json`

Jackie's interactive admin identity is not the normal production deployment identity.
