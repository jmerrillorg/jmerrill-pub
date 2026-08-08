# Microsoft First-Party Baseline

Last verified: 2026-08-08T04:34:00Z

## Required Baseline

The pruned JM1PublishingSales source requires a Dynamics-capable Sales baseline for Lead, Opportunity, Quote, and Business Process Flow components.

## Installed Capability

| Capability | Application / install path | Result | Evidence |
| --- | --- | --- | --- |
| Dataverse | Environment creation with Dataverse | ACTIVE | `pac-admin-list-after-enterprise-dev-create-2026-08-08.log` |
| Dynamics 365 Sales, Enterprise Edition App | `msdyn_SalesApp` | INSTALLED | `install-enterprise-dev-dynamics-sales-app-retry-2026-08-08.log` |

## Not Installed

No Field Service, Customer Service, Marketing/CXP, Power Pages, Business Central integration, Omnichannel, or unrelated Dynamics application was installed for Tranche 1.

## Evidence

- `pac-application-list-jm1-enterprise-dev-2026-08-08.log`
- `install-enterprise-dev-dynamics-sales-app-2026-08-08.log`
- `install-enterprise-dev-dynamics-sales-app-retry-2026-08-08.log`
- `pac-solution-list-jm1-enterprise-dev-final-2026-08-08.log`
