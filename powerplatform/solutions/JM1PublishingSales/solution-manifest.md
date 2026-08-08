# JM1PublishingSales Solution Manifest

Status: SOURCE-CONTROLLED PRUNED BASELINE / ENTERPRISE DEV IMPORT PROVEN / PRODUCTION DEPLOYMENT IDENTITY BLOCKED

## Solution

Unique name: `JM1PublishingSales`

Friendly name: `JM1 Publishing - Sales`

Purpose: Publishing Commercial Foundation plus approved Publishing Sales extensions.

Owner: J Merrill Publishing, Inc.

Publisher prefix: `jm1pub`

Publisher: `JMPublishing` / J Merrill Publishing

Current source baseline version: `1.0.0.0`

## Environments

| Lane | Environment | URL | Type | Environment ID | Status |
| --- | --- | --- | --- | --- | --- |
| DEV | JM1-Enterprise-Dev | `https://jm1enterprisedev.crm.dynamics.com/` | Sandbox | `6535a04d-307a-e6f1-bb79-5eaeb5121c1b` | CANONICAL DEV / DYNAMICS SALES BASELINE INSTALLED / IMPORT PASS |
| Legacy DEV | JM1-Dev | `https://org52409ff2.crm.dynamics.com/` | Sandbox | `a4d2d3cf-af53-e38c-970b-c6e19f4da917` | RETAINED / NOT SUITABLE FOR DYNAMICS-DEPENDENT TRANCHE 1 WORK |
| TEST/UAT | JM1-Test | `https://jm1test.crm.dynamics.com/` | Sandbox | `251b8f38-5cea-e329-b9b2-3d34ba47dd1e` | FOUND / NOT PARITY |
| PROD | JM1-Core | `https://jm1hq.crm.dynamics.com/` | Production | `dc4b2a13-3dbb-e0d1-95b8-f0e7d3a26e10` | FOUND |

## Production Posture

JM1-Core currently contains `JM1PublishingSales` as an unmanaged solution.

Managed production import remains the preferred lifecycle posture. The current unmanaged posture is documented as an exception because it predates this lifecycle standard.

## Source-Control Path

`powerplatform/solutions/JM1PublishingSales/src/`

## Component Boundary

Current pruned baseline includes:

- Lead;
- Opportunity;
- Quote;
- Publishing Submission;
- Publishing Opportunity Process BPF entity;
- Publishing Opportunity Process workflow;
- Publishing option sets, including `jm1pub_imprint` and `jm1_manuscripttype`;
- pruned Tranche 1 Publishing Sales table customizations.

Pruned from the production-exported boundary:

- Account table customizations;
- Contact table customizations;
- inherited interaction-centric dashboards/forms;
- legacy `jm1_` Lead fields;
- legacy `jm1_` and M6 Opportunity fields;
- Opportunity fields backed by ungoverned `jm1_*` option sets;
- legacy Project relationship dependency;
- static production-export `MissingDependencies` manifest.

Tranche 1 components that belong in this solution:

- D365 Sales configuration;
- publishing projection fields;
- commercial stages / BPF;
- forms;
- views;
- model-driven or Power Apps operating surface components;
- Power Automate flows where solution-aware;
- connection references;
- environment variables;
- security roles required for Tranche 1.

Explicitly excluded:

- Business Central posting;
- title/PF runtime;
- lifecycle marketing;
- post-publication;
- J Merrill Financial;
- unrelated Publishing artifacts.

## Connection References

No solution-level connection-reference component was found in the exported baseline.

Required future Tranche 1 references:

- Dataverse: REQUIRED;
- Dynamics 365 Sales: REQUIRED through Dataverse/Sales components;
- SharePoint: REQUIRED for governed agreement/artifact location;
- Outlook/Exchange: POSSIBLE for activities only;
- Teams/Approvals: REQUIRED if exception queue is implemented as Approvals;
- Stripe: RESOLVED AS `EXTEND_EXISTING` through existing governed Stripe runtime/webhook path, pending implementation proof.

## Environment Variables

No solution-level environment-variable component was found in the exported baseline.

Future Tranche 1 environment variables must be added before deployment if a flow/app requires environment-specific URLs, SharePoint locations, or Stripe projection endpoints.

## Deployment Model

Required target model:

DEV -> SOURCE CONTROL -> VALIDATE -> PACKAGE -> PROTECTED PROD IMPORT -> READBACK

Current status:

SOURCE CONTROL: ACTIVE

PACKAGE VALIDATION: UNMANAGED PASS / MANAGED EXPORT PASS / MANAGED PACK FROM UNMANAGED SOURCE NOT APPLICABLE

DEV IMPORT: PASS IN JM1-ENTERPRISE-DEV

PROD IMPORT PROOF: NOT RUN / BLOCKED BY UNCOMMISSIONED FEDERATED PAC IDENTITY

Blocker code:

`BLOCKED — PROTECTED PRODUCTION DEPLOYMENT IDENTITY NOT COMMISSIONED`

The original JM1-Dev dependency register contains 335 unique missing required components and 692 dependency edges. Boundary pruning and prerequisite recovery reduced the required Active-layer source repair to four governed components. JM1-Enterprise-Dev was created as the Dynamics-capable sandbox, `msdyn_SalesApp` was installed, and the pruned `JM1PublishingSales` package imported and published successfully there. Tranche 1 runtime implementation has not resumed because protected production deployment identity and Power Apps / Approvals ownership proof remain open.
