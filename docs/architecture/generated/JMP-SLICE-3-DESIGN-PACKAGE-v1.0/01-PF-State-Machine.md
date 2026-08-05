# PF State Machine

Status: DESIGN ONLY
Implementation authority: NO

## State Principles

The product-form state machine governs the lifecycle of an edition/product-form instance. It is not the title lifecycle by itself, and it is not the commercial catalog. Every transition must be supported by evidence and must emit or be able to emit a `jm1_executionlog` event when implemented.

State changes must fail closed when:

- Slice 2 commercial authority is missing or contradictory;
- PF-07 is treated as sellable;
- PF-08 lacks approved scope/SOW evidence;
- Editorial Master or FTL evidence is missing where required;
- ISBN assignment is attempted before verified FTL;
- author review, correction, distribution, or release evidence is absent;
- the transition is not listed as permitted here or in the transition matrix.

## State Definitions

| State | Meaning |
|---|---|
| `REQUESTED` | PF/edition has been requested or planned but is not yet contractually committed |
| `CONTRACTED` | PF/edition is covered by contract, package entitlement, approved SOW, or approved manual authority |
| `READY_FOR_PRODUCTION` | Required editorial, catalog, entitlement, artifact and gating evidence exists for production start |
| `IN_PRODUCTION` | Production work for the PF is underway |
| `INTERNAL_QA` | Production output exists and is under internal review |
| `AUTHOR_REVIEW` | Author-facing review package is available and response is required or permitted |
| `APPROVED` | Required internal and author approvals are complete |
| `DISTRIBUTION_READY` | PF is ready for submission or release handoff |
| `SUBMITTED` | PF has been submitted to a distributor, platform, printer, retailer, or release channel |
| `LIVE` | PF has confirmed-live evidence |
| `ON_HOLD` | PF is paused by governed blocker |
| `CANCELLED` | PF was stopped before live release |
| `RETIRED` | PF was live or operational and has been retired from active release posture |

## State Detail

### REQUESTED

Entry criteria:

- Title exists or is being manually evaluated.
- Requested PF is one of PF-01 through PF-08.
- Request source is a human decision, approved package intent, contract/SOW draft, or manual planning record.
- Client-title automation remains frozen.

Exit criteria:

- Commercial and entitlement authority is checked.
- Required contract/package/SOW path is selected.

Required evidence:

- request source;
- title or intake reference;
- requested PF code;
- commercial catalog read dependency where applicable;
- human actor and timestamp.

Permitted transitions:

- `REQUESTED -> CONTRACTED`
- `REQUESTED -> ON_HOLD`
- `REQUESTED -> CANCELLED`

Forbidden transitions:

- direct to `READY_FOR_PRODUCTION`, `IN_PRODUCTION`, `SUBMITTED`, `LIVE`, or `RETIRED`;
- PF-07 to sellable path;
- PF-08 without SOW/scope path.

### CONTRACTED

Entry criteria:

- Contract, package entitlement, approved SOW, or approved manual authority covers the PF.
- Pricing/entitlement aligns with Slice 2 catalog and Matrix v1.1.
- PF-08 has approved scope/SOW evidence.

Exit criteria:

- Editorial Master and prerequisite gates are ready for production readiness evaluation.

Required evidence:

- contract/package/SOW/manual authority reference;
- catalog item/price/quoting posture;
- package slot or premium entitlement;
- actor, timestamp, correlation.

Permitted transitions:

- `CONTRACTED -> READY_FOR_PRODUCTION`
- `CONTRACTED -> ON_HOLD`
- `CONTRACTED -> CANCELLED`

Forbidden transitions:

- direct to `IN_PRODUCTION`, `SUBMITTED`, or `LIVE`;
- slot swapping after contract authority without explicit correction/amendment evidence.

### READY_FOR_PRODUCTION

Entry criteria:

- Editorial Master or approved source artifact is available.
- Required title-level editorial gates are complete.
- PF-specific inputs are present.
- FTL status is either verified where required or explicitly not yet required for the PF stage.
- Commercial catalog and entitlement posture still match.

Exit criteria:

- Production work is started by an authorized human or future authorized runtime.

Required evidence:

- Editorial Master/version reference;
- title-level editorial authority;
- PF input package;
- catalog authority read;
- readiness checklist;
- execution-log-ready correlation.

Permitted transitions:

- `READY_FOR_PRODUCTION -> IN_PRODUCTION`
- `READY_FOR_PRODUCTION -> ON_HOLD`
- `READY_FOR_PRODUCTION -> CANCELLED`

Forbidden transitions:

- direct to `AUTHOR_REVIEW`, `DISTRIBUTION_READY`, `SUBMITTED`, `LIVE`;
- ISBN assignment if FTL is not verified.

### IN_PRODUCTION

Entry criteria:

- Production start is authorized.
- Required PF inputs are available.
- No blocking correction, contract, SOW, or editorial issue exists.

Exit criteria:

- Production output is produced for internal QA.

Required evidence:

- production start actor;
- PF production inputs;
- source artifact hash or reference;
- production output reference when complete.

Permitted transitions:

- `IN_PRODUCTION -> INTERNAL_QA`
- `IN_PRODUCTION -> ON_HOLD`
- `IN_PRODUCTION -> CANCELLED`

Forbidden transitions:

- direct to `APPROVED`, `SUBMITTED`, `LIVE`, `RETIRED`;
- automated client-title production while client-title automation is frozen.

### INTERNAL_QA

Entry criteria:

- PF output exists.
- Internal QA checklist is available.
- Required conformance checks for the PF are known.

Exit criteria:

- Output is approved for author review or returned to production/correction handling.

Required evidence:

- QA artifact;
- QA findings;
- source/output comparison where applicable;
- issue disposition.

Permitted transitions:

- `INTERNAL_QA -> AUTHOR_REVIEW`
- `INTERNAL_QA -> IN_PRODUCTION`
- `INTERNAL_QA -> ON_HOLD`
- `INTERNAL_QA -> CANCELLED`

Forbidden transitions:

- direct to `SUBMITTED` or `LIVE`;
- hiding unresolved QA blockers.

### AUTHOR_REVIEW

Entry criteria:

- Author-facing package exists.
- Internal-only evidence is excluded.
- Plain-language status is ready.
- Review instructions and response path are defined.

Exit criteria:

- Author approves, requests correction, fails a governed response gate, or human publisher disposition is recorded.

Required evidence:

- author-facing package manifest;
- delivery/readiness evidence;
- decision or response evidence;
- no internal execution IDs exposed.

Permitted transitions:

- `AUTHOR_REVIEW -> APPROVED`
- `AUTHOR_REVIEW -> IN_PRODUCTION`
- `AUTHOR_REVIEW -> ON_HOLD`
- `AUTHOR_REVIEW -> CANCELLED`

Forbidden transitions:

- direct to `SUBMITTED` or `LIVE`;
- author-facing exposure of internal PF state names, Dataverse terms, or execution IDs.

### APPROVED

Entry criteria:

- Required internal and author approvals are complete or author review is not required by approved rule.
- Corrections are either closed or deferred by explicit authority.
- FTL can be verified before ISBN/release actions.

Exit criteria:

- Distribution readiness is assembled and validated.

Required evidence:

- approval event;
- approved artifact/version;
- correction disposition;
- FTL evidence when required.

Permitted transitions:

- `APPROVED -> DISTRIBUTION_READY`
- `APPROVED -> IN_PRODUCTION` through `CORRECTION_AUTHORIZED`
- `APPROVED -> ON_HOLD`
- `APPROVED -> CANCELLED`

Forbidden transitions:

- direct to `LIVE`;
- direct to `IN_PRODUCTION` without correction/amendment evidence.

### DISTRIBUTION_READY

Entry criteria:

- FTL is verified.
- ISBN or identifier is assigned after FTL if required.
- Release model is defined.
- Distribution package is complete.
- 21-day propagation lead is respected unless exception authority exists.

Exit criteria:

- Submission is performed manually or future authorized runtime performs submission.

Required evidence:

- FTL reference;
- ISBN/identifier assignment evidence;
- release anchor;
- distribution package;
- platform/channel readiness.

Permitted transitions:

- `DISTRIBUTION_READY -> SUBMITTED`
- `DISTRIBUTION_READY -> IN_PRODUCTION` through `CORRECTION_AUTHORIZED`
- `DISTRIBUTION_READY -> ON_HOLD`
- `DISTRIBUTION_READY -> CANCELLED`

Forbidden transitions:

- direct to `LIVE`;
- submission before FTL/ISBN/release readiness.

### SUBMITTED

Entry criteria:

- Distribution submission occurred.
- Submission target, package, timestamp, actor, and evidence are recorded.

Exit criteria:

- Confirmed-live evidence is obtained, submission fails and returns to hold/correction, or submission is cancelled/withdrawn.

Required evidence:

- distributor/platform submission receipt;
- submitted artifact/version;
- channel identifiers;
- submission date;
- release anchor.

Permitted transitions:

- `SUBMITTED -> LIVE`
- `SUBMITTED -> ON_HOLD`
- `SUBMITTED -> DISTRIBUTION_READY`
- `SUBMITTED -> CANCELLED`

Forbidden transitions:

- direct back to `REQUESTED`, `CONTRACTED`, or `READY_FOR_PRODUCTION`;
- release anchor changes without execution-log evidence.

### LIVE

Entry criteria:

- Confirmed-live evidence exists.
- Public/release posture matches approved release plan.
- Marketplace/distribution readback exists where applicable.

Exit criteria:

- Post-live correction, retirement, or hold is approved.

Required evidence:

- confirmed-live date;
- live URL/platform/retailer/printer readback where applicable;
- edition identifier;
- release record.

Permitted transitions:

- `LIVE -> RETIRED`
- `LIVE -> ON_HOLD`
- `LIVE -> IN_PRODUCTION` only through `CORRECTION_AUTHORIZED`

Forbidden transitions:

- direct to `REQUESTED`, `CONTRACTED`, `READY_FOR_PRODUCTION`, or `SUBMITTED`;
- live rollback without rollback/correction authority.

### ON_HOLD

Entry criteria:

- A blocker prevents or pauses work.
- Owner and next action are identified.

Exit criteria:

- Blocker is resolved, cancellation is approved, or retirement is approved.

Required evidence:

- hold reason;
- blocker owner;
- next action;
- affected PF/artifact/release/correction scope.

Permitted transitions:

- `ON_HOLD -> REQUESTED`
- `ON_HOLD -> CONTRACTED`
- `ON_HOLD -> READY_FOR_PRODUCTION`
- `ON_HOLD -> IN_PRODUCTION`
- `ON_HOLD -> INTERNAL_QA`
- `ON_HOLD -> AUTHOR_REVIEW`
- `ON_HOLD -> APPROVED`
- `ON_HOLD -> DISTRIBUTION_READY`
- `ON_HOLD -> SUBMITTED`
- `ON_HOLD -> LIVE`
- `ON_HOLD -> CANCELLED`
- `ON_HOLD -> RETIRED`

Forbidden transitions:

- returning to a state whose entry criteria are not currently satisfied;
- ownerless or automation-owned blocker presentation for manual client-title production.

### CANCELLED

Entry criteria:

- PF is stopped before live release or submitted path is withdrawn before live.
- Cancellation authority is recorded.

Exit criteria:

- None for the same PF instance except a new governed request creates a new instance/version relationship.

Required evidence:

- cancellation authority;
- affected PF;
- refund/contract/distribution implications if any;
- notification or internal decision evidence.

Permitted transitions:

- none within the same instance.

Forbidden transitions:

- any state transition from the same cancelled PF instance.

### RETIRED

Entry criteria:

- PF was live or operationally active and retirement is authorized.
- Marketplace, catalog, release, and author-facing implications are recorded.

Exit criteria:

- None for the same retired instance except a new edition/version relationship through separate authority.

Required evidence:

- retirement authority;
- live/operational reference;
- affected channels;
- effective date.

Permitted transitions:

- none within the same instance.

Forbidden transitions:

- reactivation of the same retired instance without new governed edition/version authority.

## Global Forbidden Transitions

- Any transition not listed as permitted.
- Any automated client-title transition while client-title automation is frozen.
- Any PF-07 sellable/public/quotable/contractable transition.
- Any PF-08 production transition without SOW/scope evidence.
- Any ISBN assignment before verified FTL.
- Any distribution submission before distribution-ready evidence.
- Any live state without confirmed-live evidence.
- Any correction path without `CORRECTION_AUTHORIZED`.

