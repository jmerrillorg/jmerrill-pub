# JM1 Power Platform Solution Lifecycle v1.0

Classification: CANONICAL GOVERNANCE STANDARD / POWER PLATFORM ALM

Status: ACTIVE STANDARD / DEPLOYMENT PROOF BLOCKED PENDING DEV DEPENDENCY PARITY

## Purpose

JM1 Power Platform work must move through one reusable development-to-production lifecycle. The standard exists to prevent ad hoc production customization and to make future Publishing, Foundation, Financial, and enterprise Power Platform work discoverable, source-controlled, validated, deployable, and auditable.

## Required Lifecycle

Development environment
-> source-controlled solution
-> validation
-> export/package
-> protected production import
-> production readback
-> evidence
-> rollback or hold

Production is never the development environment.

## Environment Rule

Every Power Platform implementation must identify:

- DEV environment;
- TEST/UAT environment, or `NONE`;
- PROD environment;
- environment URL;
- environment ID;
- Dataverse presence;
- solution owner;
- deployment identity;
- connection references;
- environment variables;
- solution-aware apps, flows, and components.

If a suitable development environment is absent, work stops with:

`DEVELOPMENT_ENVIRONMENT_REQUIRED`

If the development environment cannot import or build the target solution because required first-party or JM1 dependencies are missing, work stops with:

`DEVELOPMENT_ENVIRONMENT_DEPENDENCY_PARITY_REQUIRED`

If the selected development sandbox cannot be brought to safe parity without broad unrelated first-party app installation, production cloning, or manual reconstruction of unmanaged production components, work stops with:

`DEVELOPMENT_SANDBOX_REQUIRED`

## Solution-Aware Requirement

All Dataverse configuration, model-driven app components, canvas apps, cloud flows, business process flows, connection references, environment variables, security roles, forms, views, and command components created for governed JM1 implementation must be solution-aware unless explicitly approved as an external dependency.

No orphan Power App, flow, form, view, approval path, or unmanaged manual customization is acceptable.

## Source-Control Requirement

Each governed solution must have a source-controlled folder under:

`powerplatform/solutions/<SolutionUniqueName>/`

The folder must include:

- unpacked solution source;
- manifest;
- environment map;
- connection-reference and environment-variable inventory;
- validation scripts or guard references;
- export/import evidence where applicable;
- checksum evidence for generated proof artifacts.

Secrets must never be committed.

## Managed / Unmanaged Rule

Preferred production deployment mode is managed solution import.

An unmanaged production solution may continue only when:

- it already exists in production;
- immediate conversion would be riskier than controlled migration;
- the exception is documented;
- future migration to managed deployment remains the preferred posture.

`JM1PublishingSales` currently exists in JM1-Core as unmanaged. Its lifecycle exception must remain visible until a governed managed conversion is approved.

## Deployment Identity

Production deployment must use a governed identity and protected environment controls. Local human credentials may be used for read-only discovery and explicitly authorized bootstrap repair only. They must not become the normal production deployment mechanism.

GitHub Actions workflows must use secret-safe identity patterns. Plaintext credentials are prohibited.

## Connection References and Environment Variables

Every connector or runtime dependency must be documented before deployment:

- Dataverse;
- Dynamics 365 Sales;
- SharePoint;
- Outlook/Exchange;
- Teams/Approvals;
- Stripe projection path;
- Azure Functions or other existing runtime dependency.

For each dependency, record:

- connection reference;
- environment variable;
- DEV binding;
- PROD binding;
- whether a secret is required;
- secret location;
- deployment behavior.

## Protected Deployment

Production import must run through a protected workflow or other approved release mechanism with:

- manual dispatch;
- explicit solution and version inputs;
- validation stage;
- package stage;
- protected production environment;
- production import;
- post-import readback;
- evidence artifact;
- fail-closed behavior.

## Readback and Evidence

Every deployment must prove:

- solution version in production;
- expected components present;
- connection references resolved;
- environment variables resolved;
- no unexpected client-facing changes;
- idempotent/repeat-safe behavior where applicable.

Evidence is stored under the relevant governed operation package and linked from the solution folder.

## Rollback / Hold

If validation or import fails, the deployment stops and records a hold. If production import partially succeeds, the release owner must use the exported prior solution artifact, managed rollback plan, or component-specific rollback procedure approved for that solution.

No silent repair in production is permitted.

## Emergency Exception

Emergency direct production repair requires:

- explicit executive authority;
- narrow statement of the production risk;
- exact components touched;
- before/after readback;
- evidence package;
- follow-up source-control reconciliation.

Emergency exception does not become precedent for ordinary implementation.

## Prohibitions

Do not:

- use production as development;
- perform direct production PAC/REST customization as a shortcut;
- commit secrets;
- create orphan apps or flows;
- deploy undocumented connection references;
- deploy undocumented environment variables;
- bypass protected production environment controls;
- use client records for validation unless specifically authorized.
