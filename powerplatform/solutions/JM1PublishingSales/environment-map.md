# JM1PublishingSales Environment Map

Last verified: 2026-08-07

| Environment | URL | Type | Role | Dataverse | Notes |
| --- | --- | --- | --- | --- | --- |
| JM1-Dev | `https://org52409ff2.crm.dynamics.com/` | Sandbox | DEV candidate | YES | Existing sandbox, but not safely remediable in this pass. The dependency register shows 335 unique missing components, including broad non-Tranche-1 first-party import drag and 38 JM1 Active-layer prerequisites without located governed packages. |
| JM1-Test | `https://jm1test.crm.dynamics.com/` | Sandbox | TEST/UAT candidate | YES | Existing sandbox. Checked read-only; not parity and has fewer JM1 prerequisite solutions than JM1-Dev. |
| JM1-Core | `https://jm1hq.crm.dynamics.com/` | Production | PROD | YES | Production system of record for JM1-Core. |
| JM1-CRM-Core | `https://jm1crm.crm.dynamics.com/` | Default | Not selected | YES | Default environment, not approved as Tranche 1 DEV. |
| One Dynamics Environment | `https://jmerrillone.crm.dynamics.com/` | Production | Not selected | YES | Separate production environment, not Publishing Tranche 1 target. |

## Current Lifecycle Decision

Development environment exists: YES

Suitable development environment ready: NO

Blocker:

`DEVELOPMENT_SANDBOX_REQUIRED`

JM1-Dev must either receive separately authorized prerequisite remediation using governed source packages and narrowly approved Microsoft app installs, or a different approved sandbox with dependency parity must be designated before Tranche 1 Power Platform implementation resumes.
