# JM1PublishingSales Solution Manifest

Status: SOURCE-CONTROLLED BASELINE / DEVELOPMENT SANDBOX REQUIRED

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
| DEV | JM1-Dev | `https://org52409ff2.crm.dynamics.com/` | Sandbox | `a4d2d3cf-af53-e38c-970b-c6e19f4da917` | FOUND / NOT SAFELY REMEDIABLE IN THIS PASS |
| TEST/UAT | JM1-Test | `https://jm1test.crm.dynamics.com/` | Sandbox | `251b8f38-5cea-e329-b9b2-3d34ba47dd1e` | FOUND / NOT PARITY |
| PROD | JM1-Core | `https://jm1hq.crm.dynamics.com/` | Production | `dc4b2a13-3dbb-e0d1-95b8-f0e7d3a26e10` | FOUND |

## Production Posture

JM1-Core currently contains `JM1PublishingSales` as an unmanaged solution.

Managed production import remains the preferred lifecycle posture. The current unmanaged posture is documented as an exception because it predates this lifecycle standard.

## Source-Control Path

`powerplatform/solutions/JM1PublishingSales/src/`

## Component Boundary

Current baseline includes:

- Account;
- Contact;
- Lead;
- Opportunity;
- Quote;
- Publishing Submission;
- Publishing Opportunity Process BPF entity;
- Publishing Opportunity Process workflow;
- Publishing option sets;
- interaction-centric dashboards inherited by the exported solution.

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

DEV IMPORT: BLOCKED BY DEPENDENCY PARITY

PROD IMPORT PROOF: NOT RUN

Blocker code:

`DEVELOPMENT_SANDBOX_REQUIRED`

The current dependency register contains 335 unique missing required components and 692 dependency edges. JM1-Dev is missing Tranche 1-aligned Dynamics Sales prerequisites, broad first-party dependencies that are not authorized for Tranche 1, and 38 JM1 `Active`-layer prerequisites without governed packages located in this repository. JM1-Test does not satisfy parity.
