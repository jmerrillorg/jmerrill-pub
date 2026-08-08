# Enterprise Development Environment Decision

Last verified: 2026-08-08T04:34:00Z

## Decision

JM1-Enterprise-Dev was created as the governed enterprise development environment for Dynamics-dependent JM1 Power Platform work.

## Environment Readback

| Field | Value |
| --- | --- |
| Display name | JM1-Enterprise-Dev |
| Environment ID | `6535a04d-307a-e6f1-bb79-5eaeb5121c1b` |
| URL | `https://jm1enterprisedev.crm.dynamics.com/` |
| Type | Sandbox |
| Dataverse organization ID | `45b44b7b-6192-f111-9969-6045bd01bf18` |
| Administrative owner | `jm1-admin@jmerrill.one` |
| Tenant | `352d075e-8e17-4169-9f8e-22e6946ce66d` |
| Creation date | 2026-08-08 |
| Intended workloads | Dynamics-dependent and solution-aware JM1 Power Platform development requiring first-party application capabilities unavailable in JM1-Dev. |

## Purpose

JM1-Enterprise-Dev is the governed enterprise development environment for Dynamics-dependent and solution-aware JM1 Power Platform development requiring first-party application capabilities unavailable in the general JM1-Dev environment. It is not a production environment and contains no live client business data.

## JM1-Dev Ruling

JM1-Dev is retained. It is not retired.

Narrow ruling: JM1-Dev is unsuitable as the development target for Dynamics-dependent JM1PublishingSales work.

## Evidence

- `create-jm1-enterprise-dev-2026-08-08.log`
- `status-jm1-enterprise-dev-create-2026-08-08.log`
- `pac-admin-list-after-enterprise-dev-create-2026-08-08.log`
- `enterprise-dev-business-record-sample-readback-2026-08-08.log`

## Boundary

Production database clone: 0.

Production client data copied: 0.

Author communications: 0.
