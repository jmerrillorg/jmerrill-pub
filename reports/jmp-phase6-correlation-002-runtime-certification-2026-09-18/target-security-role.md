# Target Security Role

Proposed role name: `JM1 Publishing Phase 6 Onboarding Runtime`

Status: DESIGNED / NOT COMMISSIONED

The role is limited to the privileges in `minimum-privilege-matrix.csv`. Delete, assign, share, security-role administration, customization, solution import, unrelated brand, financial, royalty, provider, and communication privileges are excluded.

Identity decision: `DEDICATED_PHASE6_APPLICATION_USER_REQUIRED`.

This does not authorize a new Entra application. The application user should bind to the actual nonproduction Phase 6 runtime identity once that caller and host are established. The existing shared automation identity cannot demonstrate effective least privilege while System Administrator remains attached, and its other workloads make removal unsafe. The production publishing App Service managed identity must not be repurposed as a JM1-Test caller merely to satisfy certification.

The role should be transported by the governed solution path, assigned in JM1-Test, and proven through calls made by that identity. An administrator running the suite cannot substitute for runtime proof.
