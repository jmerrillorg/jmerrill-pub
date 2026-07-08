# Wave 1 - JM1-Core Operational Activation Progress Report

**Classification:** Wave progress and activation report  
**Status:** In Progress  
**Authority:** Jackie authorization for Wave 1 Core Activation with parallel Editorial Pilot Relief Lane  
**Date:** 2026-07-08

## Mission

Bring the live publishing enterprise into alignment with the completed enterprise foundation so the business runs the capability in `JM1-Core`, not only in `JM1-Dev`.

Wave 1 now runs on two parallel tracks:

- **Track A:** JM1-Core Operational Activation
- **Track B:** Editorial Command Pilot Relief Lane

## Track A - JM1-Core Operational Activation

### Objective

Align `JM1-Core` with the enterprise foundation already completed in governance, Dev, and pilot work.

### Required outcomes

- public catalog gate active in Core
- PAM/Core alignment path defined and executed through governed activation
- Publisher Master Imprint Register reflected in Core operational truth
- website runtime validated against Core-ready records
- Enterprise Command Center updated
- Operational Hygiene completed
- Jackie operational acceptance received

### Current status

**Status:** In Progress

### Confirmed current-state facts

- the live website is pointed at `JM1-Core`, not `JM1-Dev`
- the live website no longer uses `books.json` as runtime authority
- current live catalog instability is a `JM1-Core` readiness problem, not a code-source problem
- `JM1-Core` currently lacks the governed public catalog gate needed to separate public records from active-but-not-public rows
- `JM1-Core` also lacks PAM asset-layer schema required for full enterprise alignment

### Immediate activation sequence

#### A1. Public catalog stabilization

1. add `jm1pub_publiccatalogstatus`
2. mark current active test/stale rows non-public
3. promote canonical public-ready records into Core
4. switch live catalog query to explicit public status
5. validate `/books`, `/authors`, `/imprints`, homepage featured titles, and `sitemap.xml`

#### A2. PAM/Core alignment

1. activate `jm1pub_publishingasset`
2. activate `jm1pub_assetmarketplace`
3. promote repository-reference model and supporting metadata
4. validate asset/readiness rollups in Core

#### A3. Enterprise operational alignment

1. update Enterprise Command Center to reflect live Core state
2. reconcile superseded mirrors and stale completion labels
3. run Operational Hygiene pass before completion

### Track A completion standard

Track A is complete only when:

- Core activation is complete
- runtime configuration is complete
- Dataverse validation passes
- SharePoint validation passes where applicable
- public website validation passes
- Enterprise Command Center reflects the activated capability
- Jackie accepts the live result

## Track B - Editorial Command Pilot Relief Lane

### Objective

Allow one manuscript to begin governed editorial movement before full PROGRAM-003 automation reaches Core operational status.

### Governing sources

- [PROGRAM-003 Editorial Doctrine](/Users/jmerrillone/Developer/jmerrill-pub/docs/doctrine/PROGRAM-003-Editorial-Doctrine.md)
- [PROGRAM-003 Editorial Operations Manual](/Users/jmerrillone/Developer/jmerrill-pub/docs/operations/PROGRAM-003-Editorial-Operations-Manual.md)
- [PROGRAM-003 Phase 4 Specification](/Users/jmerrillone/Developer/jmerrill-pub/docs/implementation/PROGRAM-003-Phase-4-Specification.md)
- [PROGRAM-003 SharePoint Repository Specification](/Users/jmerrillone/Developer/jmerrill-pub/docs/implementation/PROGRAM-003-SharePoint-Repository-Specification.md)

### Relief-lane principle

Active author care must not wait for full automation.

When the governed automation path is not yet operational in Core, JM1 may use a manual but governed pilot lane that:

- follows doctrine
- retains evidence in the governed repository
- preserves author approval gates
- captures interim log evidence
- can later migrate into PROGRAM-003 system records

### Relief-lane status

**Status:** Setup defined; pilot manuscript confirmation pending

### What the relief lane will support immediately

1. manuscript intake and confirmation
2. Editorial Review
3. Editorial Recommendation Letter draft
4. author approval gate A1
5. stage-plan determination for developmental/line/copy/proof
6. repository evidence retention
7. `jm1_executionlog` write when live tables permit, or controlled interim evidence log when they do not
8. Jackie review before any author-facing send

### Pilot manuscript selection status

No manuscript is yet truthfully confirmed in this report as the relief-lane pilot manuscript.

Reason:

- the lane is ready
- the governing process is ready
- but this work packet does not yet establish a second current manuscript, beyond already-progressed commissioning work, that can be named without guessing

This is therefore a real selection dependency, not a process-design blocker.

### Immediate next author-safe action

As soon as the pilot manuscript is identified, JM1 can:

1. create the governed relief-lane evidence package in SharePoint
2. mark it `TEMPORARY-PILOT-EVIDENCE`
3. store the manuscript, intake confirmation, and review packet
4. begin manual Editorial Review under doctrine
5. prepare the Editorial Recommendation Letter draft for Jackie review before any author send

## Operational Hygiene for Wave 1

Before Wave 1 may be marked complete:

- stale completion labels must be corrected
- temporary planning artifacts must be reconciled
- superseded environment-promotion assumptions must be removed
- Enterprise Command Center state must match live reality
- stale branches/worktrees tied to completed sub-waves should be merged, archived, or otherwise reduced where appropriate

## Current blockers requiring Jackie only

1. **Pilot manuscript confirmation**
   - The relief lane is designed and governed, but a manuscript should not be named here by inference.

2. **Public catalog gate approval**
   - `jm1pub_publiccatalogstatus` remains the cleanest live website gating field and still requires Jackie approval for Core activation.

## Current wave recommendation

- continue Track A into public catalog stabilization as the first Core activation step
- confirm one active manuscript for Track B immediately
- open the relief lane for that manuscript without waiting on full PROGRAM-003 Core automation

