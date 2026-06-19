# INT-PUB-005 Milestone 7C Editorial Command Center Backfill

## Purpose

Milestone #7C backfills the governed Editorial Command Center / Production Workbench layer that must exist before Milestone #9 launch and release planning. It covers the operational cockpit between agreement/onboarding/payment readiness and production/distribution/release readiness.

Milestone #7 and Milestone #8 remain valid. This backfill does not roll them back. It adds the missing editorial management body required by the June 19, 2026 canon set in `/Users/jmerrillone/Downloads/260619`, especially:

- `JMP-COMMAND-CENTER-MANIFEST-v1_0.md`
- `JMP-PIPELINE-BLUEPRINT-v1_0.md`
- `JMP-FLOW-BP07-EditorialStageTracker-v1_0.md`
- `JMP-AGENT-BP08-EditorialAgent-v1_0.md`
- `editorial-review.md`
- `developmental-editing.md`
- `line-copyedit-proof.md`
- `faith-editorial-overlay.md`
- `knowledge.md`

## Required Boundary

Milestone #9 remains paused until this layer is complete to governed readiness. Milestone #7C does not authorize:

- Flow D activation
- autonomous editorial agent execution
- autonomous manuscript rewriting
- author-facing editorial delivery
- production start for a real author
- ISBN assignment
- distribution setup
- Ingram, CoreSource, KDP, or retailer submission
- launch or release
- royalty setup
- QBO logic
- author email

## Editorial Command Center Scope

The command center tracks:

- intake reference
- diagnostic ID
- existing Opportunity ID
- author
- project title
- selected package
- imprint/path
- current editorial stage
- current production phase
- assigned owner/editor
- due date
- blocker status
- human review status
- author revision status
- proofing status
- final editorial approval status
- production handoff readiness
- safe file/reference links
- internal notes reference
- execution/task evidence

The command center does not store manuscript text, prompt body, raw model output, raw provider response, secrets, headers, tokens, or credentials.

## Editorial Stages

Milestone #7C defines these governed stages:

| Stage | Purpose |
| --- | --- |
| `REVIEW` | Editorial review and pathway confirmation |
| `DEVELOPMENTAL` | Developmental planning and supported editing path |
| `LINE` | Line edit path and calibration readiness |
| `COPYEDIT` | Copyedit path and style-sheet creation |
| `PROOFREAD` | Proofread path against the style sheet |
| `AUTHOR_REVISION` | Author revision requested/received/reviewed path |
| `HOLD_BLOCKED` | Voice, retention, hard-stop, scope, or operational hold |
| `COMPLETE_READY_FOR_PRODUCTION_HANDOFF` | Final editorial approval and production handoff readiness |

The stage tracker governs state transitions and evidence only. It performs no editorial judgment.

## Stage Transitions

The readiness model allows only governed transitions:

- `REVIEW` to `DEVELOPMENTAL`, `LINE`, `COPYEDIT`, `PROOFREAD`, `AUTHOR_REVISION`, `HOLD_BLOCKED`, or `COMPLETE_READY_FOR_PRODUCTION_HANDOFF`
- `DEVELOPMENTAL` to `LINE`, `AUTHOR_REVISION`, or `HOLD_BLOCKED`
- `LINE` to `COPYEDIT`, `AUTHOR_REVISION`, or `HOLD_BLOCKED`
- `COPYEDIT` to `PROOFREAD`, `AUTHOR_REVISION`, or `HOLD_BLOCKED`
- `PROOFREAD` to `AUTHOR_REVISION`, `HOLD_BLOCKED`, or `COMPLETE_READY_FOR_PRODUCTION_HANDOFF`
- `AUTHOR_REVISION` back to the appropriate active stage or `HOLD_BLOCKED`
- `HOLD_BLOCKED` back to the appropriate active stage after human resolution
- no transition out of `COMPLETE_READY_FOR_PRODUCTION_HANDOFF`

## Human Checkpoints

Milestone #7C requires these checkpoints:

- `READY_FOR_EDITORIAL_ASSIGNMENT`
- `EDITOR_ASSIGNED`
- `EDITORIAL_WORK_STARTED`
- `EDITORIAL_WORK_COMPLETED`
- `AUTHOR_REVISION_REQUESTED`
- `AUTHOR_REVISION_RECEIVED`
- `EDITORIAL_APPROVAL_PENDING`
- `FINAL_EDITORIAL_APPROVAL_COMPLETE`
- `READY_FOR_PRODUCTION_HANDOFF`

## Task Model

Milestone #7C prepares safe task templates for:

- editorial review task
- developmental editing task
- line editing task
- copyediting task
- proofreading task
- author revision review task
- final editorial approval task
- production handoff task

The task payload target is the existing safe table:

- table: `jm1_publishingtask`
- entity set: `jm1_publishingtasks`
- safe fields: `jm1_taskname`, `jm1_iscompleted`, `jm1_duedate`

Task payload preparation is not live task creation.

## Dataverse Source Model

Use existing tables where possible:

| Source | Use |
| --- | --- |
| `jm1_publishingtasks` | Safe editorial task payload target |
| `jm1_executionlogs` | Safe evidence and internal visibility logging |
| `jm1pub_editorialdiagnostics` | Diagnostic ID, editorial path, imprint/path, package recommendation context |
| `jm1_publishingintakes` | Intake reference and source intake context |
| Existing Opportunity | Business pipeline record; no duplicate Opportunity |

### `jm1pub_editorialstage` Confirmation

The BP-07 canon defines `jm1pub_editorialstage` as the stage-state table for live editorial tracking. It was created, published, and confirmed in Dataverse on June 19, 2026.

| Item | Value |
| --- | --- |
| Table logical name | `jm1pub_editorialstage` |
| Schema name | `jm1pub_EditorialStage` |
| Entity set | `jm1pub_editorialstages` |
| Primary ID | `jm1pub_editorialstageid` |
| Primary name | `jm1pub_name` |
| Solution | `JM1_Publishing` |
| Solution component | Confirmed |

Confirmed fields:

| Field | Purpose |
| --- | --- |
| `jm1pub_name` | Editorial stage record name |
| `jm1pub_intakereference` | Intake reference |
| `jm1pub_diagnosticid` | Diagnostic ID |
| `jm1pub_opportunityreference` | Opportunity reference |
| `jm1pub_publishingintakereference` | Publishing Intake reference |
| `jm1pub_projecttitle` | Project/title |
| `jm1pub_author` | Author label |
| `jm1pub_selectedpackage` | Selected package |
| `jm1pub_imprintpath` | Imprint/path |
| `jm1pub_stagetype` | Review, Developmental, Line, Copyedit, Proofread, Rewrite/Author Revision, Hold/Blocked, Complete/Ready for Production Handoff |
| `jm1pub_stagestatus` | Not Started, In Progress, Plan Delivered, Plan Approved, Calibration Approved, Author Revision Requested, Author Revision Received, On Hold/Blocked, Complete |
| `jm1pub_phase` | Diagnosis or Execution |
| `jm1pub_assignedownereditor` | Assigned owner/editor |
| `jm1pub_duedate` | Due date |
| `jm1pub_blockerstatus` | Blocker status |
| `jm1pub_blockerreason` | Safe blocker reason/reference |
| `jm1pub_authorrevisionrequired` | Author revision required |
| `jm1pub_authorrevisionrequesteddate` | Author revision requested date |
| `jm1pub_authorrevisionreceiveddate` | Author revision received date |
| `jm1pub_stylesheeturl` | SharePoint style-sheet reference |
| `jm1pub_editorialdeliverableurl` | SharePoint deliverable reference |
| `jm1pub_finaleditorialapprovalstatus` | Final editorial approval status |
| `jm1pub_productionhandoffapprovalstatus` | Production handoff approval status |
| `jm1pub_internalvisibilitystatus` | Internal visibility status |
| `jm1pub_executionlogcorrelationreference` | Execution log/correlation reference |
| `jm1pub_voiceflag` | Voice-preservation hold |
| `jm1pub_retentionfail` | Retention-rule hold |
| `jm1pub_hardstopflag` | Hard-stop hold |
| `jm1pub_flagnote` | Safe flag note/reference |
| `jm1pub_stagestartdate` | Stage start date |
| `jm1pub_stagecompletedate` | Stage completion date |

## Editorial Agent Readiness

BP-08 defines `jm1-agent-pub-editorial-01` as a future supervised editorial execution agent. Milestone #7C records readiness only:

- status: `PROPOSED_NOT_ACTIVE`
- human approval required
- no autonomous manuscript rewrite
- no autonomous author-facing delivery
- no raw manuscript logging
- no prompt body logging
- no raw model output logging

Future supported capabilities may include editorial review support, developmental edit support, line edit support, copyedit/proofread support, issue detection, style-sheet generation, editorial recommendation drafting, and human review packet generation.

## Faith, Imprint, and Doctrine Overlay

The command center preserves the canon from `knowledge.md`, `editorial-review.md`, `developmental-editing.md`, `line-copyedit-proof.md`, and `faith-editorial-overlay.md`.

Rules:

- Faith, street-lit, and children's overlays are internal-only.
- Overlay names and governance references do not appear in author-facing materials.
- Faith-forward standards apply where the manuscript/imprint context qualifies.
- Faith overlay is not over-applied to non-faith titles.
- Style-sheet references are tracked safely.
- Final imprint authority remains Jackie's G3 decision.

## Internal Visibility

Milestone #7C prepares internal visibility to:

- `publishing@jmerrill.one`

The internal notification is safe and internal-only. It does not include the author in To/CC/BCC. It does not send author email and does not include manuscript text, prompt body, raw model output, secrets, headers, tokens, or full provider response.

## Evidence Payload

Milestone #7C prepares one safe `jm1_executionlog` payload with:

- diagnostic ID
- intake reference code
- existing Opportunity ID
- current editorial stage
- readiness result
- readiness blockers
- schema readiness status
- boundary confirmations

The evidence payload does not include manuscript text, prompt body, raw model output, secrets, headers, tokens, credentials, payment links, invoice URLs, contract send URLs, distribution submission IDs, or release details.

## Implementation

The Milestone #7C readiness implementation is:

`azure-functions/diagnostic-ai-runner/src/editorial/milestone7cEditorialCommandCenter.js`

It provides:

- editorial queue model
- editorial project/status model
- editorial stage tracker readiness
- editorial phase transition rules
- human checkpoint model
- deliverable/reference tracking
- style-sheet reference tracking
- author revision path
- editorial hold/blocker path
- final editorial approval and production handoff readiness
- future editorial agent readiness
- safe Dataverse evidence payload
- internal visibility payload
- fail-closed unsafe field handling

It does not:

- create `jm1pub_editorialstage` rows
- create publishing tasks
- run an editorial agent
- perform editorial judgment
- rewrite a manuscript
- send author-facing editorial content
- send author email
- activate Flow D
- start production
- assign ISBN
- start distribution setup
- submit to Ingram or retailers
- launch or release
- start royalty setup
- create duplicate Opportunity
- use QBO
- expose credentials

## Gate

Gate:

- `JM1_EDITORIAL_COMMAND_CENTER_ENABLED`
- `JM1_EDITORIAL_STAGE_TRACKER_ENABLED`

Default:

- `false`

Both gates remain false unless separately authorized. The command-center gate controls live workbench operation. The stage-tracker gate controls BP-07 transition processing.

The gate is separate from:

- `JM1_AI_EXECUTION_ENABLED`
- `JM1_INTERNAL_NOTIFICATIONS_ENABLED`
- `JM1_AUTHOR_RESPONSE_SEND_ENABLED`
- `JM1_PUBLISHING_ONBOARDING_ENABLED`
- `JM1_OPPORTUNITY_CREATION_ENABLED`
- `JM1_OPPORTUNITY_UPDATE_ENABLED`
- `JM1_AGREEMENT_PREPARATION_ENABLED`
- `JM1_STRIPE_PAYMENT_OPTIONS_ENABLED`
- `JM1_AUTHOR_PAYMENT_LINK_SEND_ENABLED`
- `JM1_PRODUCTION_AUTHORIZATION_ENABLED`
- `JM1_DISTRIBUTION_SETUP_ENABLED`

Milestone #7C must not open any of those gates.

## Current Controlled Record

The current controlled record remains:

| Item | Value |
| --- | --- |
| Intake reference | `JMP-INT-202606-UFYG60` |
| Diagnostic ID | `64e387e0-7e6a-f111-a826-00224820105b` |
| Existing Opportunity | `2653fca9-eacd-4c44-b3ed-1764dd5d35aa` |
| Opportunity name | `Publishing Intake - Establishing Glory: The Library` |

Milestone #7C is system-readiness only. Live editorial work for a real author remains blocked until author-specific readiness is satisfied, human authorization is recorded, and the command center/stage-tracker gates are explicitly enabled.
