# ENV-001 - JM1 Environment Promotion Doctrine

**Classification:** Enterprise environment doctrine  
**Status:** Revised draft for Jackie review  
**Authority:** Jackie Smith Jr.  
**Date:** 2026-07-08

## Purpose

ENV-001 establishes the governed environment-promotion doctrine for JM1 so that capabilities move from controlled development to live business operation through operational activation rather than informal patching.

This doctrine reflects the enterprise lesson now proven across PROGRAM-002, PAM, and the website catalog transition:

- Dev success is necessary.
- Dev success is not sufficient.
- A wave is not complete until the business is successfully running the capability in JM1-Core.

## Why ENV-001 Changed

JM1 no longer needs a default permanent `Dev -> Test -> Core` promotion model.

EIF-002 now provides the governing discipline that a traditional standing Test environment would normally enforce:

- doctrine before build
- operations before architecture
- readiness before implementation
- controlled implementation before activation
- live validation before completion

The website catalog incident is the motivating example.

The issue was not primarily code quality. The issue was operational activation before JM1-Core was ready with the governed schema, data, and visibility rules required by the live website.

ENV-001 now formalizes the correction.

## Canonical JM1 Operational Activation Lifecycle

The standard JM1 promotion lifecycle is now:

`Doctrine`

`-> Operations`

`-> Readiness Review`

`-> Architecture`

`-> Specification`

`-> Controlled Dev Implementation`

`-> Operational Readiness Review`

`-> Core Activation`

`-> Operational Validation`

`-> Wave Complete`

This is the default enterprise path unless Jackie explicitly authorizes a different path.

## Canonical Environment Roles

### JM1-Dev

**Purpose:** design, build, prototype, pilot, controlled validation.

JM1-Dev is where JM1 teams may:

- create or revise schema
- create or revise solutions
- build and test functions, flows, dashboards, and integrations
- prove repository logic
- validate pilot records and migration approaches
- perform controlled implementation against non-live data

JM1-Dev is expected to change frequently.

JM1-Dev is not the live business and must not be treated as enterprise operational truth.

### JM1-Core

**Purpose:** live enterprise, operational truth, public website, Author Workspace, publishing operations, business intelligence, enterprise automation.

JM1-Core represents the business.

JM1-Core is where governed live capability exists, including:

- live Dataverse operational truth
- public website reads
- live workspace and publisher workflows
- operational SharePoint repository linkage
- approved enterprise automation
- executive and operational reporting

If a feature affects the live business, its finish line is JM1-Core operational activation, not JM1-Dev validation.

### JM1-Test

**Purpose:** optional temporary validation environment when risk justifies isolated verification.

JM1-Test is no longer part of the default mandatory promotion path.

Use JM1-Test only when an initiative has:

- unusual enterprise risk
- multiple developers or parallel release pressure
- broad cross-system impact
- rollback complexity that justifies isolated rehearsal
- a need for managed-package validation separate from Core activation

JM1-Test may still be valuable, but it is now optional and situational rather than structurally mandatory.

## What Counts as Production / Live

The following are production/live:

- JM1-Core Dataverse
- Azure Static Web Apps production runtime
- Azure Functions or integrations pointed at JM1-Core
- live SharePoint governed repository paths used by operations
- live workspace and website behavior
- business intelligence or dashboards used for enterprise decision-making

If a public or operational surface reads it, depends on it, or displays it, it is live.

## Controlled Dev Implementation Boundary

### What belongs in Dev

- schema authoring
- choice sets
- relationships
- rules
- functions
- flows
- dashboards
- migration logic
- repository logic
- pilot data
- validation scripts
- controlled commissioning

### What must reach Core before a wave is complete

- any schema needed by a live app or workflow
- any data read by the public website
- any operational reference data used by workspaces or command centers
- any permissions required by live app identities
- any runtime configuration required by live systems
- any governed records required for business truth

## Operational Activation Doctrine

No JM1 initiative is operational merely because it works in Dev.

A capability becomes operational only when:

1. It is implemented and validated in JM1-Dev.
2. It passes Operational Readiness Review.
3. It is promoted or activated in JM1-Core.
4. Runtime configuration is complete.
5. Dataverse validation passes in Core.
6. SharePoint validation passes where applicable.
7. Website, workspace, application, or automation validation passes where applicable.
8. Enterprise Command Center reflects the capability where applicable.
9. Jackie operational acceptance is received.

Until then:

**Status = In Progress**

Not Complete.

## Promotion Gates

Every enterprise wave must satisfy these gates.

### Gate 1 - Readiness Review

- purpose defined
- operating model defined
- governance defined
- ownership defined
- boundaries defined
- success criteria defined
- enterprise relationships defined

If these are incomplete, return to Operations rather than beginning implementation.

### Gate 2 - Controlled Dev Implementation

- schema or code validates in JM1-Dev
- required tests pass
- pilot behavior is documented
- dependencies are known
- live runtime assumptions are explicit
- no major ambiguity remains in the scope being activated

### Gate 3 - Operational Readiness Review

- Core target identified
- activation scope identified
- runtime configuration identified
- migration path documented
- validation checklist prepared
- rollback/remediation path documented
- operational owner identified
- Enterprise Command impact identified

### Gate 4 - Core Activation

- approved schema promoted where required
- approved data promoted where required
- app settings/environment variables configured
- app identities and privileges verified
- repository structures or references created where required

### Gate 5 - Operational Validation

- Dataverse reads/writes behave correctly in Core
- SharePoint or repository linkage behaves correctly
- website/workspace/application routes behave correctly
- execution logging behaves correctly
- dashboard or command-center rollup behaves correctly
- business users can actually use the capability

### Gate 6 - Wave Completion

- live validation passed
- enterprise reporting updated where affected
- Jackie operational acceptance received
- remaining exceptions documented

## Solution Packaging Rules

1. Author in JM1-Dev using supported governed tooling.
2. Do not hand-author solution XML for first-time Dataverse table creation.
3. Portable packaging doctrine in `ALM-001` still governs packaging discipline.
4. Use JM1-Test when the change risk, scope, or blast radius warrants isolated rehearsal.
5. JM1-Core should receive governed packages, supported deployment actions, or governed activation steps, not ad hoc undocumented patching.

## Schema Migration Rules

1. New schema begins in JM1-Dev.
2. Core schema activation must follow Operational Readiness Review.
3. Core schema changes must have:
   - field inventory
   - dependency check
   - activation checklist
   - validation checklist
   - rollback/remediation note
4. Live runtimes must not depend on fields or tables that exist only in Dev.

## Data Migration Rules

1. Dev pilot data does not become production truth automatically.
2. Canonical business data requires an explicit Core promotion or governed writeback path.
3. Production data migration must define:
   - source authority
   - target entity and fields
   - idempotency behavior
   - duplicate prevention
   - reconciliation method
   - remediation handling
4. Public-facing data must have an explicit public-readiness rule, not merely `Active` state.

## Runtime Configuration Rules

1. Runtime configuration must be explicit by environment.
2. Core activation is incomplete until required configuration is live.
3. Azure configuration readiness must track:
   - required setting names
   - target values by environment
   - app identity
   - secret storage path
   - restart/redeploy requirement
4. A Core deployment without the required configuration is still `In Progress`.

## Operational Activation Checklist

- doctrine and operations complete
- readiness review passed
- controlled Dev validation complete
- Core target confirmed
- migration path confirmed
- runtime config list confirmed
- validation checklist prepared
- rollback/remediation path documented

## Core Activation Checklist

- schema promoted where required
- governed data promoted where required
- app identities verified
- permissions verified
- environment variables/app settings configured
- deployment/restart completed
- repository or SharePoint references validated

## Operational Validation Checklist

- Dataverse validation passed
- SharePoint validation passed where applicable
- website validation passed where applicable
- workspace validation passed where applicable
- application/automation validation passed where applicable
- execution-log validation passed where applicable
- Enterprise Command Center updated where applicable
- live smoke validation passed

## Wave Completion Checklist

- development complete
- Operational Readiness Review passed
- Core activated
- runtime configuration complete
- Dataverse validated
- SharePoint validated where applicable
- website/workspace/application validated where applicable
- Enterprise Command Center updated where applicable
- live operational validation passed
- Jackie operational acceptance received

## Rollback and Remediation

Rollback must be considered at three levels:

1. **Schema rollback**
   - corrective deployment, managed rollback where applicable, or explicit suppression/remediation plan
2. **Data rollback**
   - idempotent migration, reversible mappings where possible, reconciliation plan where not
3. **Runtime rollback**
   - app setting reversal, deployment rollback, feature gate closure, or read-path suppression

If rollback is not truly possible, remediation must be documented before Core activation.

## Immediate Doctrine Implication

JM1-Core cannot be treated as operationally ready merely because a live application points to it correctly.

Core must also contain:

- the governed schema
- the governed records
- the governed runtime configuration
- the governed visibility rules

That is the lesson of the website catalog incident, and it is the reason ENV-001 now adopts operational activation as the standard completion model.
