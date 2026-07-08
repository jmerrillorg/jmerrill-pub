# ENV-001 - JM1 Operational Activation Plan

**Classification:** Implementation planning document  
**Status:** Revised draft for Jackie review  
**Authority:** ENV-001 doctrine draft  
**Date:** 2026-07-08

## Objective

Create the governed operational-activation path that moves JM1 capabilities from controlled Dev implementation to live Core operation without treating Dev completion as the finish line.

The default path is now:

`JM1-Dev -> Operational Readiness Review -> JM1-Core Activation -> Operational Validation -> Wave Complete`

JM1-Test remains optional when risk justifies isolated validation.

## Current State

- JM1-Dev contains active schema/build work for PAM and PROGRAM-003.
- JM1-Core is the live website and enterprise operational source of truth.
- The website catalog incident proved that Core readiness must be treated as a first-class gate.
- JM1-Test exists and remains usable, but it is not the default mandatory lane.

## Standard Operational Activation Path

### Stage A - Controlled Dev Implementation

Author and validate in JM1-Dev:

- schema
- roles
- rules
- functions
- flows
- repository references
- migration scripts
- pilot records

Deliverables:

- governed Dev implementation
- field inventory
- migration draft
- validation evidence

### Stage B - Operational Readiness Review

Before Core activation, confirm:

- live target environment
- activation scope
- required schema
- required data
- required runtime configuration
- required permissions
- validation checklist
- rollback/remediation plan

Deliverables:

- readiness review result
- activation checklist
- validation checklist
- rollback/remediation checklist

### Stage C - Core Activation

Activate in JM1-Core:

- governed schema changes
- approved data migration
- app setting/environment variable configuration
- app identity and security configuration
- repository/reference linkage

Deliverables:

- Core activation record
- configuration confirmation
- Dataverse validation evidence

### Stage D - Operational Validation

Validate in live conditions:

- Dataverse behavior
- SharePoint behavior where applicable
- website behavior where applicable
- workspace behavior where applicable
- dashboard/command-center behavior where applicable
- execution-log behavior where applicable

Deliverables:

- live validation evidence
- exception list
- operational acceptance recommendation

## Optional JM1-Test Usage

JM1-Test should be used when a wave has:

- unusual risk
- broad cross-system impact
- multi-developer coordination pressure
- complex rollback needs
- package/import risk worth rehearsing before Core

JM1-Test is helpful, but it is not part of the default required completion path.

## Immediate Catalog Stabilization Plan

The public website now correctly reads JM1-Core. The remaining issue is Core catalog readiness.

### Stabilization Step 1 - Add a real public catalog gate

Recommended field on `jm1pub_title`:

- `jm1pub_publiccatalogstatus`
- values:
  - `Draft`
  - `Public`
  - `Hidden`
  - `Retired`

### Stabilization Step 2 - Change the live query rule

The public catalog should not treat `Active` as equivalent to public-ready.

Target rule:

- `statecode eq 0`
- and `jm1pub_publiccatalogstatus eq Public`

### Stabilization Step 3 - Promote canonical public-ready title records to Core

Promote governed public-ready records including:

- title name
- primary author
- certified imprint
- slug
- public summary where approved
- public catalog status

### Stabilization Step 4 - Keep current test rows out of the public path

Do not delete yet. Instead:

- classify
- leave non-public
- preserve for separate reconciliation or cleanup work

## PAM / PROGRAM-003 Operational Activation Sequence

### Sequence 1 - Public Catalog Stabilization

1. Add `jm1pub_publiccatalogstatus`
2. Promote canonical public-ready title rows
3. Update live website query rule
4. Validate `/books`, `/authors`, `/imprints`, homepage featured titles, and sitemap
5. Update Enterprise Command Center
6. Obtain Jackie operational acceptance

### Sequence 2 - PAM Core Activation

Activate in JM1-Core:

- `jm1pub_publishingasset`
- `jm1pub_assetmarketplace`
- supporting choices and relationships
- repository reference model required for live operations

Then:

- migrate canonical asset records
- validate repository linkage
- validate health calculations
- validate dashboard rollups

### Sequence 3 - PROGRAM-003 Core Activation

Activate in JM1-Core only after:

- Dev pilot validated
- readiness review passed
- editorial repository path validated
- approval-gate and security model accepted

Activate:

- `jm1pub_editorialstage`
- `jm1pub_editorialartifact`
- `jm1pub_editorialapprovalgate`
- `jm1pub_editorialsummary`
- `jm1pub_editorialexception`

Then:

- validate workspace read model
- validate editorial dashboard rollup
- validate execution-log events
- keep live editorial advancement gated until commissioning acceptance

## Core Activation Checklist

- target Core environment confirmed
- app identity confirmed
- required schema confirmed
- required data migration confirmed
- required settings list confirmed
- permission model confirmed
- rollback/remediation plan documented

## Operational Validation Checklist

- Dataverse validation passed
- SharePoint validation passed where applicable
- website validation passed where applicable
- workspace validation passed where applicable
- command-center validation passed where applicable
- execution-log validation passed where applicable
- live user workflow validation passed

## Wave Completion Checklist

- development complete
- Operational Readiness Review passed
- Core promoted/activated
- runtime configuration complete
- Dataverse validated
- SharePoint validated where applicable
- website/workspace/application validated where applicable
- Enterprise Command Center updated
- live operational validation passed
- Jackie operational acceptance received

## Rules by Change Type

### Schema

- controlled Dev implementation
- readiness review
- Core activation through supported governed path
- optional Test rehearsal only when justified

### Reference Data

- source authority confirmed
- mapping validated
- idempotent migration
- Core validation
- operational acceptance

### Runtime Configuration

- required setting names confirmed
- Core values confirmed
- restart/redeploy completed
- live smoke validation completed

### Public Website Dependencies

- no Dev-only schema assumptions in live code
- no implicit `Active = Public`
- no Core activation without actual Core-ready records

## Jackie-Only Decisions

1. Approve `jm1pub_publiccatalogstatus` as the formal public website gate.
2. Confirm whether current Core test rows remain preserved but non-public after the new field is activated.
3. Confirm whether PAM Core activation precedes broader public catalog expansion.
4. Confirm whether any upcoming wave requires optional JM1-Test use because of unusual risk.
