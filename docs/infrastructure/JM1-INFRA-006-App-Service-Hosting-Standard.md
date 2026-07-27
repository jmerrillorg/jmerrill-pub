# JM1-INFRA-006 App Service Hosting Standard

**Classification:** Enterprise infrastructure hosting standard
**Status:** Draft for Jackie review
**Authority:** Jackie
**Date:** 2026-07-27
**Scope:** Planning and architecture only. No Azure resource creation, DNS cutover, production deployment, or Static Web Apps retirement is authorized by this document.

## Purpose

JM1-INFRA-006 establishes the enterprise hosting rule for JM1 properties as the platform grows from public static sites into application-enabled workspaces, APIs, governed integrations, and transaction-adjacent operations.

This standard begins the App Service migration program without treating the July 2026 Static Web Apps 503 incident as proof that Static Web Apps is categorically unsuitable. The stronger basis is capability fit:

- authenticated Author Operating Center;
- Next.js server routes;
- Dataverse and Microsoft Graph integration;
- Stripe Author Payout Enrollment and future payout governance;
- Azure Communication Services email relay;
- Key Vault and managed-identity requirements;
- Business Central orchestration;
- production health gates, rollback, and observability;
- APIs, agent workflows, and event-driven execution.

## Governing Hosting Rule

App Service is the default runtime for JM1 properties that contain authenticated workspaces, APIs, workflow execution, regulated data, server-side integrations, or business transactions.

Static Web Apps may remain the default for genuinely static public-facing properties that do not require server-side identity, secret-backed integrations, or operational transaction boundaries.

## Property Classification

| Property | Hosting recommendation | Rationale | Migration status |
| --- | --- | --- | --- |
| `jmerrill.pub` | Migrate first to Azure App Service for Linux | Current Publishing runtime already contains authenticated author operations, server routes, Dataverse, Graph, Stripe enrollment, and governed artifacts. | Program candidate, not cut over |
| `jmerrill.one` | Migrate or rebuild next as umbrella application and shared-services entry point | Expected enterprise identity entry point, appointments, cross-brand routing, shared services, and future unified account experience. | Planned after Publishing |
| `jmerrill.financial` | Design for App Service now; migrate when authenticated client/API capabilities are commissioned | Financial identity, logs, secrets, deployment rights, and regulated workflows should remain isolated. | Future capability-gated wave |
| `jmerrill.org` / Foundation | Keep on Static Web Apps while primarily informational | Move only when portals, donations, case management, grants, volunteer operations, or governed data justify it. | Static acceptable for now |
| `jmerrill.productions` | Defer | Division paused. | Deferred |
| ACS relay and specialized jobs | Keep as separate Azure Functions where event-driven execution is better fit | Relay or queue failure must not take down the public website process. | Retain separation |

## Target Resource Pattern

JM1 brands may share an App Service Plan for cost and capacity efficiency, but each brand must use its own Web App resource.

```text
JM1 App Service Plan
  -> jm1-one-web
  -> jm1-publishing-web
  -> jm1-financial-web
  -> jm1-foundation-web
  -> jm1-productions-web (deferred)
```

Each application-enabled brand requires its own:

- Web App resource;
- managed identity;
- custom domain;
- configuration set;
- deployment pipeline;
- staging slot;
- health endpoint;
- logs and alerts;
- access boundary.

Financial must remain separated at the Web App resource and managed-identity level from day one, even if it initially shares a plan. A regulated or resource-intensive workload may later move to a dedicated App Service Plan without changing the domain architecture.

## Publishing Target Architecture

`jmerrill.pub` should migrate as a whole Next.js application, not as a split Static Web Apps front end plus linked backend, unless a later architecture exception proves that split is safer.

Target state:

```text
jmerrill.pub
  -> Azure App Service for Linux
  -> Next.js application
  -> production and staging deployment slots
  -> managed identity
  -> Key Vault references or managed-identity secret retrieval
  -> Application Insights
  -> ACS / Functions for event-driven jobs
  -> Dataverse, Graph, Stripe, and Business Central integrations
```

The ACS relay remains a separate Function App when that separation improves reliability. The public website should call the relay asynchronously or fail gracefully.

## Why App Service Fits The Direction

### Managed Identity And Key Vault

The current Static Web Apps runtime can use encrypted application settings, but the target JM1 credential model is:

```text
App Service managed identity
  -> Key Vault
  -> Stripe / Graph / Dataverse / governed services
```

App Service supports managed identities and Key Vault references. The application identity can be granted only the permissions required for its runtime responsibilities.

### Deployment Slots

Deployment slots support the desired JM1 promotion sequence:

```text
build
  -> deploy to staging slot
  -> runtime certification
  -> health window
  -> slot swap
  -> continued monitoring
  -> swap-back rollback if necessary
```

This is a stronger production-control model than treating a completed deploy job as proof that production is healthy.

### Health Management

App Service Health Check can probe a configured route and remove unhealthy instances from load balancing. JM1 should define an application-aware endpoint such as `/api/health` that validates safe startup and dependency readiness without disclosing secrets.

Minimum health response dimensions:

- release identifier;
- required configuration presence;
- Dataverse readiness at safe read level;
- Graph readiness at safe read level;
- artifact service readiness at safe read level;
- payment gate state;
- dependency degradation flags.

### Backend Flexibility

Static Web Apps remains useful for public static sites, but its API model has constraints that matter for JM1 application-enabled properties, including HTTP-only API access, request-duration limits, one backend API type per environment, and limitations around linked backends in pull-request environments.

JM1 should not continue stretching a primarily static hosting model when the product surface now includes authenticated workspaces, Microsoft and Stripe integrations, governed artifacts, and future Business Central orchestration.

## Migration Waves

### Wave 1 - Platform Foundation

Establish the shared standard before moving a public domain:

- target App Service Plan and region;
- infrastructure as code;
- managed identities;
- Key Vault references;
- Application Insights;
- staging and production slots;
- health endpoint;
- custom-domain and certificate plan;
- deployment and rollback pipeline;
- backup and evidence standard;
- resource naming and tagging.

### Wave 2 - `jmerrill.pub`

Migrate Publishing first because it has the strongest current need and the most mature certification evidence.

Run both platforms in parallel temporarily:

```text
App Service staging hostname
  -> full runtime proof
  -> custom-domain cutover
  -> monitored stabilization
  -> Static Web Apps retained as rollback for defined period
  -> later retirement
```

### Wave 3 - `jmerrill.one`

Move or rebuild the umbrella site as the shared enterprise experience:

- identity entry point;
- appointments;
- cross-brand routing;
- enterprise status and shared services;
- future unified account experience.

### Wave 4 - Financial And Foundation

Move each based on capability readiness. Financial should plan for App Service before adding authenticated client workflows, protected documents, or financial APIs. Foundation can remain on Static Web Apps while informational.

## Non-Goals

This standard does not authorize:

- moving every brand simultaneously;
- migrating solely because of one unresolved 503;
- placing all brands into one monolithic Web App;
- moving ACS relay work into the website process;
- shutting down Static Web Apps on cutover day;
- combining App Service migration with Business Central royalty implementation;
- production DNS cutover;
- production author activation;
- Stripe charges, transfers, refunds, or payouts;
- enabling `JM1_STRIPE_COMMISSIONING_PAYMENT_ENABLED`;
- broad architecture changes without parallel validation and rollback.

## Dependencies

| Dependency | Status | Required before production cutover |
| --- | --- | --- |
| INFRA-004 credential harmonization | Draft execution planning | Managed identity and Key Vault target must be reconciled for App Service runtime |
| JM1-INFRA-005 deployment reliability | Open PR at time of this package | Health gate, rollback evidence, and incident classification should carry into App Service pipeline |
| ENV-001 promotion doctrine | Current canon candidate | App Service migration must follow readiness, staging proof, operational validation, and Jackie acceptance |
| PROGRAM-002 / PROGRAM-004 runtime certification | Completed for current certified scope | Must be rerun against App Service staging before cutover |

## Microsoft Reference Basis

- Azure App Service managed identities: <https://learn.microsoft.com/en-us/azure/app-service/overview-managed-identity>
- Azure App Service Key Vault references: <https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references>
- Azure App Service deployment slots: <https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots>
- Azure App Service Health Check: <https://learn.microsoft.com/en-us/azure/app-service/monitor-instances-health-check>
- Azure Static Web Apps API support overview: <https://learn.microsoft.com/en-us/azure/static-web-apps/apis-overview>
- Azure Static Web Apps bring-your-own Functions restrictions: <https://learn.microsoft.com/en-us/azure/static-web-apps/functions-bring-your-own>
- Azure Static Web Apps with App Service backend: <https://learn.microsoft.com/en-us/azure/static-web-apps/apis-app-service>

## Current Decision

**BEGIN APP SERVICE MIGRATION PROGRAM: YES**

First production workload candidate:

**J Merrill Publishing (`jmerrill.pub`)**

Enterprise hosting standard:

**App Service for application-enabled properties**

Static Web Apps:

**Retain only for genuinely static properties**

Migration pace:

**Move by capability and risk, not all at once**

## Completion Criteria

INFRA-006 is complete only when:

1. App Service platform foundation is provisioned through governed infrastructure.
2. `jmerrill.pub` staging runs the application from App Service.
3. Managed identity and Key Vault runtime configuration are proven without secret exposure.
4. Runtime certification passes on App Service staging.
5. Health checks and observability pass.
6. DNS cutover plan and rollback are approved.
7. Cutover completes with monitored stabilization.
8. Static Web Apps rollback retention period ends or is formally extended.
9. Jackie accepts operational activation.

Until then:

**Status = App Service migration program initiated, production migration not complete.**
