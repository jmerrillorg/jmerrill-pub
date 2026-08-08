# JM1PublishingSales Environment Map

Last verified: 2026-08-08

| Environment | URL | Type | Role | Dataverse | Notes |
| --- | --- | --- | --- | --- | --- |
| JM1-Dev | `https://org52409ff2.crm.dynamics.com/` | Sandbox | DEV target attempted | YES | Existing sandbox. Boundary pruning succeeded, but the pruned package failed because the Dynamics Sales baseline is missing. PAC installation of `msdyn_SalesApp`, `msdynce_Sales`, `msdynce_LeadManagement`, and `msdynce_ProductManagement` failed. |
| JM1-Enterprise-Dev | `https://jm1enterprisedev.crm.dynamics.com/` | Sandbox | Canonical Dynamics-capable DEV target | YES | Created 2026-08-08 for Dynamics-dependent JM1PublishingSales work. Dynamics Sales app installed. JM1PublishingSales import and publish passed. |
| JM1-Test | `https://jm1test.crm.dynamics.com/` | Sandbox | TEST/UAT candidate | YES | Existing sandbox. Checked read-only; not parity and has fewer JM1 prerequisite solutions than JM1-Dev. |
| JM1-Core | `https://jm1hq.crm.dynamics.com/` | Production | PROD | YES | Production system of record for JM1-Core. |
| JM1-CRM-Core | `https://jm1crm.crm.dynamics.com/` | Default | Not selected | YES | Default environment, not approved as Tranche 1 DEV. |
| One Dynamics Environment | `https://jmerrillone.crm.dynamics.com/` | Production | Not selected | YES | Separate production environment, not Publishing Tranche 1 target. |

## Current Lifecycle Decision

Development environment exists: YES

Suitable Dynamics-capable development environment ready: YES

Remaining lifecycle blocker:

`BLOCKED — PROTECTED PRODUCTION DEPLOYMENT IDENTITY NOT COMMISSIONED`

JM1-Enterprise-Dev is ready for DEV work. Full ALM proof and Tranche 1 runtime resumption remain blocked until the protected production deployment identity and ownership proof are closed.
