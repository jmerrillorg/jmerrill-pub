# JM1-INFRA-006 App Service Migration Program Package

Prepared: 2026-07-27
Branch: `codex/jm1-infra-006-app-service-migration-program`
Base: `519c4c89c764dcb6ff491ccb1db450fc09accb74`
Status: PROGRAM INITIATED / REVIEW REQUIRED

## Executive Decision

JM1 should begin the App Service migration program now.

This is not an emergency reaction to a single Static Web Apps 503 incident. The controlling reason is platform fit: JM1 Publishing and future JM1 properties now require authenticated workspaces, server-side integrations, managed identity, Key Vault-backed configuration, health gates, rollback discipline, observability, and transaction-adjacent workflows.

## Canonical Hosting Rule

App Service is the default runtime for JM1 properties that contain authenticated workspaces, APIs, workflow execution, regulated data, server-side integrations, or business transactions.

Static Web Apps remains acceptable for genuinely static public-facing properties.

## Created Package

| File | Purpose |
| --- | --- |
| `docs/infrastructure/JM1-INFRA-006-App-Service-Hosting-Standard.md` | Enterprise hosting standard, property classification, target architecture, migration waves, Microsoft reference basis, and completion criteria |
| `docs/operations/JM1-INFRA-006-Publishing-App-Service-Migration-Runbook.md` | Operational runbook for `jmerrill.pub` migration, staging proof, cutover, rollback, evidence, and go/no-go states |
| `docs/implementation/JM1-INFRA-006-App-Service-Migration-Program-Package-2026-07-27.md` | Implementation package and review summary for this initiation wave |

## Migration Order

| Wave | Scope | Status |
| --- | --- | --- |
| 1 | Platform foundation: App Service Plan, IaC, identities, Key Vault, slots, health, observability, DNS/cert plan | Planned |
| 2 | `jmerrill.pub` App Service migration | Planned first workload |
| 3 | `jmerrill.one` umbrella/shared-services application | Planned after Publishing |
| 4 | `jmerrill.financial` and Foundation | Capability-gated |
| Deferred | `jmerrill.productions` | Deferred while division paused |

## Enterprise Resource Model

JM1 properties may share an App Service Plan but must not be deployed into one monolithic Web App.

Each application-enabled brand requires a separate Web App resource, managed identity, configuration boundary, deployment pipeline, staging slot, health endpoint, logs, alerts, and custom domain.

Financial remains isolated at the Web App and managed-identity level from day one.

## Publishing Target

Recommended target:

```text
jmerrill.pub
  -> Azure App Service for Linux
  -> Next.js application
  -> production and staging slots
  -> managed identity
  -> Key Vault
  -> Application Insights
  -> ACS / Functions for event-driven jobs
  -> Dataverse, Graph, Stripe, and Business Central integrations
```

The ACS relay remains separate where event-driven isolation improves reliability.

## Relationship To INFRA-005

The current production-reliability wave should become the entry discipline for INFRA-006, not be discarded.

Carry forward from INFRA-005:

- pinned deployment dependencies;
- explicit production health gate;
- repeated health probes;
- rollback evidence;
- incident classification;
- deployment evidence artifact discipline.

At package creation time, PR #341 remained open and clean. This INFRA-006 package does not modify PR #341.

## Validation And Evidence Boundary

This wave is documentation and governance only.

Validation required:

- repository status clean before and after edits;
- `git diff --check`;
- no `.codex-tmp/`;
- no generated evidence;
- no secrets;
- no Azure resource creation;
- no production deployment.

## Still Required Before Any App Service Cutover

| Gate | Owner | Status |
| --- | --- | --- |
| Approve App Service resource naming, region, tags, and cost posture | Jackie / Azure admin | Required |
| Decide App Service Plan SKU and initial instance count | Jackie / Azure admin | Required |
| Prepare infrastructure as code | Engineering | Required |
| Confirm managed identity and Key Vault reference model | Engineering / Azure admin | Required |
| Confirm App Service staging and production slot configuration | Engineering / Azure admin | Required |
| Implement App Service deployment pipeline | Engineering | Required |
| Re-certify PROGRAM-002 Author Portal controls on App Service staging | Engineering | Required |
| Re-certify artifact access on App Service staging | Engineering | Required |
| Confirm no secret exposure in HTML, JavaScript, logs, or evidence | Engineering | Required |
| Approve custom-domain and DNS cutover | Jackie / Azure admin | Required |
| Retain Static Web Apps rollback window | Jackie / Engineering | Required |
| Approve production cutover | Jackie | Required |

## Explicit Non-Authorization

This package does not authorize:

- Azure resource creation;
- DNS changes;
- production deployment;
- production App Service cutover;
- Static Web Apps retirement;
- Business Central royalty implementation;
- author activation;
- Stripe onboarding-link delivery;
- charges, transfers, refunds, or payouts;
- enabling `JM1_STRIPE_COMMISSIONING_PAYMENT_ENABLED`;
- broad author rollout;
- evidence deletion.

## Current Classification

**BEGIN APP SERVICE MIGRATION PROGRAM: APPROVED FOR PLANNING**

**PRODUCTION CUTOVER: NOT AUTHORIZED**

**STATIC WEB APPS: RETAINED FOR CURRENT PRODUCTION AND ROLLBACK**

**FIRST MIGRATION CANDIDATE: `jmerrill.pub`**
