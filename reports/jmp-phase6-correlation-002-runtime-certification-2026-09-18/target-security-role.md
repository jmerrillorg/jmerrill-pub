# Target Security Role

Role name: `JMP Phase 6 Onboarding Runtime - JM1-Test`

Status: COMMISSIONED IN JM1-TEST / LIVE CALL PROOF PENDING

The role is limited to the privileges in `minimum-privilege-matrix.csv`. Delete, assign, share, security-role administration, customization, solution import, unrelated brand, financial, royalty, provider, and communication privileges are excluded.

Identity decision: `SUITABLE_REUSE — EXISTING UAT MANAGED IDENTITY`.

No Entra application was created. The role is assigned to the existing system-assigned managed identity of `func-jm1-publishing-inbound-uat` through dedicated Dataverse application user `c8b4a60b-1ab4-f111-aaac-70a8a59b112b`. The existing shared automation identity remains untouched, and the production Publishing App Service identity was not repurposed.

Live readback shows 41 effective privileges: global read only for the exact correlation/platform metadata and basic-scope create/write/append for Phase 6-owned records. The role has no delete, assign, share, role administration, customization, solution import, unrelated-brand, financial, royalty, provider, or communication privilege. A post-deployment call made by this managed identity is still required; an administrator running the suite cannot substitute for runtime proof.
