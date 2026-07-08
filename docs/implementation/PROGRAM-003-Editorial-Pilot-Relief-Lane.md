# PROGRAM-003 - Editorial Pilot Relief Lane

**Classification:** Interim governed pilot runbook  
**Status:** Active setup draft  
**Authority:** Jackie authorization for Editorial Command Pilot Relief Lane during Wave 1 Core Activation  
**Date:** 2026-07-08

## Purpose

This document defines the immediate manual-but-governed editorial pilot lane to be used when active author care cannot wait for full PROGRAM-003 automation.

This is not a replacement for PROGRAM-003.

It is a controlled relief lane that:

- follows the approved doctrine
- follows the approved operations manual
- uses SharePoint as the governed evidence repository
- uses Dataverse where live capability already exists
- preserves mandatory author approval gates
- creates evidence that can later migrate into full PROGRAM-003 records

## Relief-Lane Rule

If automation is not ready, JM1 may use a manual governed lane.

That lane must still:

- preserve author safety
- preserve publisher review
- preserve repository evidence
- preserve execution evidence
- preserve stage truth
- avoid unmanaged manuscript movement

## Scope

The relief lane supports one active manuscript at a time unless Jackie expands scope.

It supports:

1. manuscript intake and confirmation
2. Editorial Review
3. Editorial Recommendation Letter draft
4. Jackie review before author send
5. author approval gate A1
6. stage plan for developmental, line, copy, and proof
7. repository evidence retention
8. interim execution evidence

It does not support:

- automatic downstream workflow execution
- unmanaged stage skipping
- author-facing promises beyond the work JM1 can actually execute now
- hidden editorial progression without approval evidence

## Governing Sources

- [PROGRAM-003 Editorial Doctrine](/Users/jmerrillone/Developer/jmerrill-pub/docs/doctrine/PROGRAM-003-Editorial-Doctrine.md)
- [PROGRAM-003 Editorial Operations Manual](/Users/jmerrillone/Developer/jmerrill-pub/docs/operations/PROGRAM-003-Editorial-Operations-Manual.md)
- [PROGRAM-003 SharePoint Repository Specification](/Users/jmerrillone/Developer/jmerrill-pub/docs/implementation/PROGRAM-003-SharePoint-Repository-Specification.md)
- [PROGRAM-003 Execution-Log Specification](/Users/jmerrillone/Developer/jmerrill-pub/docs/implementation/PROGRAM-003-Execution-Log-Specification.md)
- [PROGRAM-003 Phase 4 Specification](/Users/jmerrillone/Developer/jmerrill-pub/docs/implementation/PROGRAM-003-Phase-4-Specification.md)

## Pilot Evidence Model

When PROGRAM-003 live schema is not yet operational in Core, the relief lane uses a clearly marked interim package:

`TEMPORARY-PILOT-EVIDENCE`

This label must appear:

- in the tracker/document title
- in the SharePoint evidence package
- in any interim status document used for the lane

This ensures the lane is governed but not mistaken for final system automation.

## Required Evidence Package

For the pilot manuscript, create one governed SharePoint package containing:

1. manuscript source file
2. intake confirmation record or intake reference
3. editorial review notes
4. recommendation summary
5. author-facing recommendation draft
6. Jackie review/approval evidence before send
7. author approval/response evidence
8. stage-plan summary for developmental, line, copy, and proof
9. interim execution evidence log if live `jm1_executionlog` use is not available

## Suggested Repository Layout

Within the governed SharePoint repository, create a pilot package using the title/author convention already approved for PROGRAM-003 repository work.

Suggested substructure:

- `00_Inbox-Manuscript`
- `01_Editorial-Review`
- `02_Recommendation-Draft`
- `03_Jackie-Review`
- `04_Author-Approval-Gate-A1`
- `05_Stage-Plan`
- `99_TEMPORARY-PILOT-EVIDENCE`

No file may live outside the governed repository package once the relief lane begins.

## Relief-Lane Workflow

### Step 1 - Manuscript intake and confirmation

Required:

- manuscript present and readable
- title and author identified
- intake reference linked where available
- repository package created

Evidence:

- manuscript file
- intake note or reference
- confirmation note in the pilot tracker

### Step 2 - Editorial Review

Required:

- manuscript reviewed under doctrine
- risks, hard stops, and route identified
- imprint lens captured for review purposes where applicable
- recommended editorial path captured

Evidence:

- editorial review summary
- risk/exception notes
- recommendation basis

### Step 3 - Editorial Recommendation Letter draft

Required:

- author-facing recommendation prepared
- safe summary language only
- no internal scoring language
- no unmanaged AI-only output

Evidence:

- draft letter
- supporting internal summary

### Step 4 - Jackie review before author send

Required:

- Jackie reviews the draft
- approve, revise, or hold decision recorded

Evidence:

- approval note
- revised draft where applicable

### Step 5 - Author approval gate A1

Required:

- approved recommendation sent to author
- author response captured
- acceptance, decline, clarification, or hold recorded

Evidence:

- sent recommendation artifact
- author response artifact
- A1 decision entry

### Step 6 - Editorial stage plan

Required:

- determine whether developmental editing is required
- determine line, copy, and proof sequence
- identify human review expectations
- identify expected future gates

Evidence:

- stage-plan document
- required deliverable summary
- required approval-gate summary

## Interim Execution Evidence

### Preferred path

If live Dataverse logging is safely available, write material events to `jm1_executionlog`.

### Relief path

If live PROGRAM-003 logging tables are not yet available for the pilot, maintain a controlled interim evidence log inside the governed repository package.

Minimum event set:

- `PILOT_MANUSCRIPT_CONFIRMED`
- `EDITORIAL_REVIEW_STARTED`
- `EDITORIAL_REVIEW_COMPLETED`
- `RECOMMENDATION_DRAFT_PREPARED`
- `JACKIE_REVIEW_COMPLETED`
- `AUTHOR_RECOMMENDATION_SENT`
- `AUTHOR_RESPONSE_RECEIVED`
- `A1_APPROVAL_RECORDED`
- `STAGE_PLAN_LOCKED`

## Author-Facing Boundaries

Authors may receive:

- clear review status
- recommendation summary
- required next action
- approval request
- safe editorial guidance

Authors may not receive:

- internal scoring
- internal hard-stop mechanics
- doctrine language
- system architecture language
- unapproved downstream promises

## Jackie Review Boundary

No author-facing recommendation may be sent from the relief lane without Jackie review first.

This is mandatory until full PROGRAM-003 Core activation is operational and separately accepted.

## Pilot Manuscript Selection Rule

The selected manuscript must be:

- active
- readable
- appropriate for Editorial Review
- not already too far downstream to misrepresent its actual stage
- safe to handle in the governed repository

Do not guess the pilot manuscript identity from stale or indirect evidence.

## Immediate Next Action Once Manuscript Is Named

1. create the governed SharePoint package
2. mark it `TEMPORARY-PILOT-EVIDENCE`
3. place manuscript and intake confirmation inside
4. open Editorial Review
5. prepare recommendation draft for Jackie review

## Migration Forward

Once PROGRAM-003 Core activation is live, relief-lane evidence should be migrated or linked into the proper system records so the pilot does not become a shadow system.

The relief lane exists to protect author care, not to create a permanent side path.
