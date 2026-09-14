# Microsoft Tenant Rationalization Handoff

Target stream: JM1 Microsoft Tenant Rationalization - Publisher Legacy Credential Retirement and Identity Closure

## Handoff facts

- SOURCE_WORK_PACKAGE = JMP-AUTH-004
- CANONICAL_PUBLISHING_SHA = 28b2e6fd988c92d5b0045593d43a78b6aa97daac
- PR734_MERGE_SHA = 235339ccad0f213e248786ebee2f950bf7ef7a34
- PR734_DEPLOYMENT_RUN = 34895548620
- CURRENT_PRODUCTION_DEPLOYMENT_RUN = 34896255878
- DATAVERSE_CUTOVER_RESULT = PASS
- GRAPH_SHAREPOINT_CUTOVER_RESULT = PASS
- NEGATIVE_PROOFS = PASS
- ROLLBACK_PROOF = PASS
- OBSERVATION_RESULT = PASS_BOUNDED

## Credential retirement boundary

Do not retire any credential solely from JMP-AUTH-004.

Machine runtime has moved to managed identity for Dataverse and Graph/SharePoint under `PUBLISHER_RUNTIME_AUTH_MODE=MANAGED_IDENTITY`; however, rollback secrets are still intentionally present and exact per-password-key use could not be distinguished from sign-in logs.

The old Publisher interactive app remains required:

- app = JM1 Publisher Operating Center
- client id = 7bd27a68-fda7-4330-9198-d493f2a0a5ef
- old password credentials before = 3
- old password credentials retired = 0
- old password credentials after = 3

Recommended MTR next step:

Perform a bounded credential retirement review that separates:

- migrated machine runtime credentials now eligible for rollback-window review
- interactive Publisher Operating Center credentials that remain non-retirement-ready until an independent interactive auth replacement/rotation authority exists
- any downstream App Service, Key Vault, GitHub, Azure AD, Dataverse, and SharePoint references that still point to the old app registrations
