# JM1PublishingSales Environment Map

Last verified: 2026-08-07

| Environment | URL | Type | Role | Dataverse | Notes |
| --- | --- | --- | --- | --- | --- |
| JM1-Dev | `https://org52409ff2.crm.dynamics.com/` | Sandbox | DEV candidate | YES | Existing sandbox, but missing dependencies required to import current `JM1PublishingSales` baseline. |
| JM1-Test | `https://jm1test.crm.dynamics.com/` | Sandbox | TEST/UAT candidate | YES | Existing sandbox. Not selected for DEV. |
| JM1-Core | `https://jm1hq.crm.dynamics.com/` | Production | PROD | YES | Production system of record for JM1-Core. |
| JM1-CRM-Core | `https://jm1crm.crm.dynamics.com/` | Default | Not selected | YES | Default environment, not approved as Tranche 1 DEV. |
| One Dynamics Environment | `https://jmerrillone.crm.dynamics.com/` | Production | Not selected | YES | Separate production environment, not Publishing Tranche 1 target. |

## Current Lifecycle Decision

Development environment exists: YES

Suitable development environment ready: NO

Blocker:

`DEVELOPMENT_ENVIRONMENT_DEPENDENCY_PARITY_REQUIRED`

JM1-Dev must be brought to dependency parity with the components required by `JM1PublishingSales`, or a different sandbox with dependency parity must be designated before Tranche 1 Power Platform implementation resumes.

