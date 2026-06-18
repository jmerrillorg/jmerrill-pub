# INT-PUB-005 Stage 0 Diagnostic Production Readiness Plan

**Status:** Planning only
**Date:** 2026-06-18
**PR:** #84
**Production activation:** Not authorized
**Gate state:** Closed (`JM1_AI_EXECUTION_ENABLED=false`)

---

## 1. Purpose

This plan defines what must be true before INT-PUB-005 Stage 0 Diagnostic AI can move from one successful limited pilot to controlled production readiness.

It does not authorize Flow D activation, additional manuscript processing, author-facing output, author email, Opportunity creation, package recommendation, or unattended production execution.

The next approved work after PR #83 is planning, not another diagnostic run.

---

## 2. Canon State After PR #83

| Area | Status |
|---|---|
| Real-manuscript pilot evidence | Successful safe result recorded in PR #83 |
| Schema validation | Passed |
| No-quotation / output validation | Passed, 0 violations |
| Routing | Needs Human Review |
| Confidence | 0.79 |
| Author-facing output | None |
| Author email | None |
| Opportunity | None |
| Flow D production activation | None |
| Gate | Closed (`JM1_AI_EXECUTION_ENABLED=false`) |
| Additional runs | None authorized |

Reference evidence:

- [`int-pub-005-real-manuscript-pilot-attempt-4.md`](./int-pub-005-real-manuscript-pilot-attempt-4.md)
- [`int-pub-005-stage0-diagnostic-ai-activation-decision-record.md`](./int-pub-005-stage0-diagnostic-ai-activation-decision-record.md)

---

## 3. Controlled Production Definition

Controlled production means a restricted, reviewable, manually gated execution mode where Stage 0 diagnostic AI may run only for explicitly eligible records and only inside the approved diagnostic boundary.

Controlled production does not mean general automation. It does not permit bulk backfill, historical intake processing, automatic author communication, Opportunity creation, package recommendation, or automatic next-stage advancement.

Minimum characteristics:

| Control | Requirement |
|---|---|
| Record eligibility | Only current INT-PUB-005 Stage 0 Editorial Diagnostic records that satisfy the approved gates |
| Trigger model | Manual approval required before each production run or tightly bounded batch |
| Gate state | `JM1_AI_EXECUTION_ENABLED` remains false until an approved execution window |
| Output use | Internal editorial review only |
| Human review | Required for every result, including Completed |
| Side effects | Diagnostic record and safe logs only |
| Expansion | Requires a separate governance decision after controlled-production evidence is reviewed |

---

## 4. Allowed Records

A record may be eligible for controlled production only if all conditions are true:

| Requirement | Rule |
|---|---|
| Intake path | Originated through INT-PUB-005 `/join` governed intake |
| Flow A | Contact and Lead creation/linkage completed |
| Flow B | Author acknowledgment completed through ACS relay |
| Flow C | Stage 0 Editorial Diagnostic handoff created |
| Opportunity | No Opportunity has been created by the diagnostic path |
| Manuscript asset | Manuscript asset is attached through the approved manuscript asset process |
| Asset gate | `jm1_manuscriptapprovedfordiagnostic=true` and approved asset status |
| Legacy exclusion | Record is not Legacy-flagged |
| Intake reference | `jm1_intakereferencecode` present and traceable |
| Diagnostic ID | Specific `jm1pub_editorialdiagnostic` ID is named before execution |
| Human owner | Jackie or assigned operator approves the record for execution |

Not allowed:

- Historical Publishing Intake backfill
- Legacy-flagged records
- Records without approved manuscript assets
- Records created outside the governed intake/handoff path unless separately approved
- Any record lacking a named human approval
- Bulk "all ready records" execution

---

## 5. Manual Review Gates

Controlled production requires human review before and after each diagnostic execution.

### Pre-run gate

Before any run:

1. Confirm the exact diagnostic ID and intake reference.
2. Confirm the manuscript asset gate is passed.
3. Confirm Legacy exclusion.
4. Confirm `knowledge.md` expected hash and approved prompt version.
5. Confirm no author-facing output will be sent.
6. Confirm no Opportunity or package recommendation will be created.
7. Confirm the execution window and who is responsible for closing the gate.

### Post-run gate

After any run:

1. Close `JM1_AI_EXECUTION_ENABLED` immediately.
2. Confirm response status and safe response fields.
3. Confirm schema validation and no-quotation/output validation.
4. Confirm routing status and confidence.
5. Confirm AI Request Log and Execution Log were written with safe metadata only.
6. Confirm no author-facing output, email, Opportunity, or next-stage movement occurred.
7. Record the result in an operations evidence PR before any expansion decision.

---

## 5a. Author-Facing Email Visibility Gate

No author-facing diagnostic email is authorized in the initial controlled-production phase.

If a later governed phase authorizes any author-facing system email, the email path must satisfy all visibility requirements before activation:

| Requirement | Rule |
|---|---|
| Human-approved phase | Author-facing diagnostic email requires a separate explicit approval after internal-only production evidence is reviewed |
| Internal visibility | Every author-facing system email must be copied to, or internally mirrored to, `publishing@jmerrill.one` |
| Send logging | Every send event must be logged in Dataverse with safe metadata |
| Diagnostic boundary | Email content must not expose raw diagnostic output, manuscript text, prompt body, or raw model output |
| Failure handling | If copy/mirror or send logging fails, the email path must fail closed |

This rule applies to future author-facing system emails. It does not change Flow B's current ACS acknowledgment behavior.

---

## 6. Dataverse Write Boundaries

Controlled production may write only the approved diagnostic and logging fields already defined in the execution contract.

Permitted write targets:

| Target | Permitted purpose |
|---|---|
| Editorial Diagnostic | Diagnostic execution status, confidence, human review flag, concise diagnostic fields, timestamps, attempt count, safe error status |
| AI Request Log | Safe request metadata, model/provider, prompt key/version, token counts, correlation ID, status |
| Execution Log | Safe lifecycle event, correlation ID, human review status, safe error code |
| Future author-facing email log | Safe send metadata only, if a later author-facing phase is approved |

Prohibited writes:

- Opportunity creation or update
- Lead stage, Lead disposition, or sales routing changes
- Contact enrichment unrelated to existing Flow A behavior
- Author email status changes outside Flow B
- Raw prompt body
- Raw manuscript text
- Raw model output
- Request headers, cookies, tokens, API keys, or connection strings
- Author-facing recommendation text
- Package selection or contract terms

Any new Dataverse field, table, relationship, option-set value, or write target requires a separate approved schema/governance PR before implementation.

---

## 7. Flow D Boundaries

Flow D may not be activated for production until a separate implementation PR and deployment authorization are approved.

When considered, Flow D must remain bounded to:

- Detect an eligible Stage 0 Editorial Diagnostic record.
- Confirm the manuscript asset gate and Legacy exclusion.
- Call the diagnostic runner only when a manual approval gate is satisfied.
- Persist only approved diagnostic result fields and safe logs.
- Set the record to a human-review status after execution.

Flow D must not:

- Automatically process every record that passes the asset gate.
- Process historical rows.
- Send author email.
- Create Opportunity.
- Advance Lead or package routing.
- Activate author-facing output.
- Retry real-manuscript calls without an approved retry policy.
- Bypass `JM1_AI_EXECUTION_ENABLED`.

---

## 8. Failure Handling

Failure handling must fail closed.

| Failure | Required handling |
|---|---|
| Gate closed | Return safe blocked response; no Dataverse read, no model call |
| Unauthorized runner key | Return unauthorized; no pipeline stages reached |
| Missing or invalid diagnostic ID | Return safe validation error |
| Legacy record | Defer or block; no model call |
| Manuscript asset gate not passed | Defer; no model call |
| Manuscript read failure | Mark safe exception/deferred state; no raw file details in logs |
| Model call failure | Mark safe exception; no retry unless explicitly approved |
| Schema validation failure | Fail closed; do not write diagnostic output |
| No-quotation/output validation failure | Fail closed; do not write diagnostic output |
| Metadata write failure | Record safe exception state where possible; do not trigger author-facing action |

Retries require an explicit retry policy before production activation. The retry policy must define maximum attempts, backoff, idempotency, safe logging, and who approves a retry.

---

## 9. Author-Facing Restrictions

Controlled production diagnostics remain internal-only.

Diagnostic automation starts internal-only. Author-facing diagnostic email is not part of the initial controlled-production phase.

Not authorized:

- Sending the diagnostic result to the author
- Sending an author email based on diagnostic output
- Presenting AI-generated recommendations as editorial decisions
- Mentioning package fit, contract terms, acceptance, rejection, or pricing to the author
- Updating public-facing status from AI output

Any author-facing communication flow requires a separate PR and explicit authorization after Jackie reviews production-readiness evidence.

Before any author-facing system email is activated, the approved design must copy or internally mirror each email to `publishing@jmerrill.one` and log the send event in Dataverse using safe metadata.

---

## 10. Logging Requirements

Every controlled-production run must produce enough safe evidence to audit the execution without exposing protected content.

Required safe evidence:

| Evidence | Required |
|---|---|
| Diagnostic ID and intake reference | Yes |
| Correlation ID | Yes |
| Gate before/during/after run | Yes |
| Provider and model alias | Yes |
| Prompt key/version | Yes |
| `knowledge.md` hash match | Yes |
| Manuscript asset gate result | Yes |
| Manuscript read status, byte count, word count, hash | Yes |
| Token counts | Yes |
| Schema validation status | Yes |
| No-quotation/output validation status | Yes |
| Confidence and routing | Yes |
| AI Request Log ID | Yes |
| Execution Log ID | Yes |
| Confirmation of no author-facing side effects | Yes |
| Dataverse logging for every diagnostic run | Yes |
| Future author-facing email copy/internal mirror and send log | Required before any author-facing email phase |

Prohibited evidence:

- Raw manuscript text
- Prompt body containing manuscript content
- Raw model output
- Secrets, tokens, cookies, headers, connection strings, or API keys
- Full author PII outside already governed record references

---

## 11. Activation Prerequisites

Before controlled production can be considered, the following must be complete:

| Prerequisite | Status |
|---|---|
| PR #83 merged as successful pilot evidence | Done |
| Production-readiness plan reviewed | Pending |
| Explicit approval for controlled-production implementation planning | Pending |
| Explicit implementation scope for Flow D production path | Pending |
| Manual approval mechanism defined | Pending |
| Retry policy defined | Pending |
| Idempotency policy defined | Pending |
| Safe monitoring checklist defined | Pending |
| Rollback plan defined and tested | Pending |
| Operator runbook drafted | Pending |
| Jackie approval for production activation | Not granted |

Production activation remains unauthorized until all pending items are complete and Jackie explicitly approves activation.

---

## 12. Recommended PR Sequence

| PR | Purpose | Execution allowed |
|---|---|---|
| #84 | Production readiness plan | No |
| Future PR | Operator runbook and manual approval checklist | No |
| Future PR | Flow D controlled-production design/spec | No |
| Future PR | Flow D implementation behind closed gate | No unattended production run |
| Future PR | Controlled-production activation evidence | Only if separately authorized |

Each PR should preserve the current boundary: no author-facing output, no author email, no Opportunity, no automatic next-stage advancement, and no processing beyond explicitly approved records.

---

## 13. Non-Authorization Statement

This plan is not production activation.

As of this PR:

- `JM1_AI_EXECUTION_ENABLED=false`
- No additional diagnostic run is authorized
- No Flow D production activation is authorized
- No author-facing output is authorized
- No author email is authorized
- No Opportunity creation is authorized
- No broad or historical record processing is authorized

The next governance decision is whether to approve controlled-production implementation planning, not whether to run more manuscripts.

---

## 14. PR #85 - Controlled Diagnostic Queue for Approved Intake Records

PR #85 introduces an internal-only controlled diagnostic queue selection layer for INT-PUB-005 Stage 0 diagnostics.

Queue selection is not production activation. It only evaluates whether a diagnostic record has the required governance fields and safe state to be considered for a later controlled run. It does not process records automatically.

### Queue eligibility

A diagnostic record is queue-eligible only when all conditions are true:

| Requirement | Rule |
|---|---|
| Diagnostic ID | Present and valid enough for safe record identification |
| Intake reference | Present and tied to the governed intake |
| Manuscript asset URL | Present and valid as a governed asset URL |
| Manuscript asset status | Ready or approved |
| Approved for diagnostic | `jm1_manuscriptapprovedfordiagnostic=true` |
| File type | Supported diagnostic format (`.docx` or `.txt`) |
| Execution status | Ready for diagnostic selection |
| Attempt count | Below retry/failure limit |
| Manual block | Not manually blocked |
| Gate | Real diagnostic processing remains controlled by `JM1_AI_EXECUTION_ENABLED` |

### Blocking conditions

Queue selection fails closed when required fields are missing, the manuscript asset is not approved, the file type is unsupported, the diagnostic already completed, the diagnostic is processing, the diagnostic already requires human review, retry/failure limits are exceeded, the record is manually blocked, or execution status is missing or malformed.

### Non-activation boundary

PR #85 does not authorize:

- Automatic broad production execution
- Flow D activation
- Real manuscript diagnostic processing
- Opening `JM1_AI_EXECUTION_ENABLED`
- Author-facing diagnostic output
- Author email
- Opportunity creation
- Historical row processing

Human review remains required for every diagnostic result. Any future author-facing system email must be copied to, or internally mirrored to, `publishing@jmerrill.one`, and the send event must be logged in Dataverse.

---

## 15. PR #86 - Internal Diagnostic Result Review Layer

PR #86 introduces an internal-only diagnostic result review payload layer for validated Stage 0 diagnostic results.

The review layer prepares safe diagnostic output for human review after schema validation, no-quotation/output validation, and confidence routing have succeeded. It does not authorize author-facing communication, Opportunity creation, Flow D activation, or production automation.

### Review payload boundary

The internal review payload may include:

| Field | Purpose |
|---|---|
| `diagnosticId` | Safe diagnostic record identifier |
| `intakeReferenceCode` | Safe governed intake reference |
| `diagnosticOutputSummary` | Validated concise internal diagnostic summary |
| `diagnosticRiskFlags` | Validated internal risk flags |
| `confidence` | Validated 0.0-1.0 confidence score |
| `requiresHumanReview` | Always `true` |
| `routingDecision` | Safe routing result and basis |
| `reviewStatus` | Defaults to `PENDING_HUMAN_REVIEW` |
| `approvalStatus` | Defaults to `PENDING_HUMAN_REVIEW` |
| `reviewedBy` / `reviewedOn` | `null` until human review occurs |
| `preparedAt` | Safe preparation timestamp |
| `metadata` | Safe provider/model/prompt/token metadata only |

### Safety exclusions

The internal review payload must not include manuscript text, extracted manuscript content, prompt body, raw model response, author-facing email body, email send fields, Opportunity fields, Flow D trigger fields, secrets, tokens, headers, or keys.

### Non-activation boundary

PR #86 does not authorize:

- Diagnostic production activation
- Real manuscript diagnostic processing
- Author-facing diagnostic output
- Author email
- Opportunity creation
- Flow D activation
- Broad production automation

Human review remains required before any author-facing communication. Any future author-facing system email must still copy or internally mirror to `publishing@jmerrill.one`, and the send event must be logged in Dataverse.

---

## 16. PR #87 - Diagnostic Result Persistence for Internal Review

PR #87 introduces an internal diagnostic review persistence adapter for safe Stage 0 diagnostic review payloads.

The persistence layer is for internal review only. It accepts the PR #86 safe review payload after schema validation, no-quotation/output validation, and confidence routing have succeeded, then prepares it for persistence against the existing `jm1pub_editorialdiagnostic` review record pattern. It does not authorize diagnostic execution, author-facing output, author email, Opportunity creation, Flow D activation, or broad production automation.

### Persistence target and field map

The approved persistence home is the existing `jm1pub_editorialdiagnostic` record for the diagnostic. PR #87 does not create a new Dataverse table.

The exact Dataverse target is:

| Item | Value |
|---|---|
| Table display name | `Editorial Diagnostic` |
| Table logical name | `jm1pub_editorialdiagnostic` |
| Entity set | `jm1pub_editorialdiagnostics` |
| Record identity | Existing `jm1pub_editorialdiagnosticid` row identified by `diagnosticId` |

The internal review payload maps to existing confirmed fields:

| Review payload item | Dataverse logical field | Storage rule |
|---|---|---|
| `diagnosticId` | `jm1pub_editorialdiagnosticid` | Existing row ID; used to address the update, not duplicated |
| `intakeReferenceCode` | `jm1_diagnosticstructuredoutputjson` | Stored inside the safe structured review packet for audit correlation |
| `diagnosticOutputSummary` | `jm1_diagnosticoutputsummary` | Concise validated summary only |
| `diagnosticRiskFlags` | `jm1_diagnosticriskflags` | Concise validated risk labels only |
| `confidence` | `jm1_diagnosticconfidence` | Decimal 0.0-1.0 |
| `requiresHumanReview` | `jm1_diagnosticrequireshumanreview` | Always `true` |
| `routingDecision.status` | `jm1_diagnosticexecutionstatus` | Existing diagnostic status choice, for example `835500004` Needs Human Review |
| `routingDecision`, `reviewStatus`, `approvalStatus`, `preparedAt`, safe metadata | `jm1_diagnosticstructuredoutputjson` | Safe JSON packet only; no manuscript text, prompt body, or raw model output |
| `reviewStatus=PENDING_HUMAN_REVIEW` | `jm1_humanreviewstatus` | Stored as `835510000` Pending Review |
| `approvalStatus=PENDING_HUMAN_REVIEW` | `jm1_humanreviewstatus` | Represented by the same pending human review choice until a separate approval model is authorized |
| `reviewedBy` | `jm1_humanreviewedby` | `null` until human review occurs |
| `reviewedOn` | `jm1_humanreviewedon` | `null` until human review occurs |
| Internal review note | `jm1_humanreviewnotes` | Safe note: pending internal human review; no author-facing output authorized |
| Safe model/provider metadata | `jm1_diagnosticagentid` | Model/deployment/provider identifier, if present |
| Safe correlation/execution ID | `jm1_diagnosticcorrelationid` | Correlation or execution ID, if present |

No author email field, Opportunity field, Flow D trigger field, manuscript field, prompt field, or raw model output field is part of the persistence map.

### Safe fields prepared for persistence

The adapter may persist only:

| Field | Purpose |
|---|---|
| `diagnosticId` | Existing diagnostic record ID |
| `intakeReferenceCode` | Governed intake reference stored in safe structured review packet |
| `diagnosticOutputSummary` | Validated concise internal diagnostic summary |
| `diagnosticRiskFlags` | Validated internal risk labels |
| `confidence` | Validated 0.0-1.0 confidence score |
| `requiresHumanReview` | Always `true` |
| `routingDecision` | Safe routing status, label, and basis |
| `reviewStatus` | `PENDING_HUMAN_REVIEW`, represented by `jm1_humanreviewstatus=835510000` |
| `approvalStatus` | `PENDING_HUMAN_REVIEW`, represented by `jm1_humanreviewstatus=835510000` until a separate approval model is authorized |
| `reviewedBy` / `reviewedOn` | `null` until human review occurs |
| `preparedAt` | Safe payload preparation timestamp |
| `metadata` | Safe provider, model, prompt, correlation/execution ID, and token-count metadata only |

### Safety exclusions

The persistence layer must not persist manuscript text, extracted manuscript content, prompt body, raw model response, author-facing email body, author email send fields, Opportunity fields, Flow D trigger fields, secrets, tokens, keys, headers, or arbitrary external file URLs beyond already-governed safe asset references.

### Fail-closed behavior

Persistence refuses to write when the review payload is missing, identifiers are missing or malformed, the diagnostic summary or risk flags are empty, confidence is missing/non-finite/out of range, `requiresHumanReview` is not `true`, review or approval status is not `PENDING_HUMAN_REVIEW`, unsafe fields are present, the Dataverse client is missing, or the Dataverse write fails.

### Non-activation boundary

PR #87 does not authorize:

- Diagnostic production activation
- Automatic diagnostic runs
- Opening `JM1_AI_EXECUTION_ENABLED`
- Author-facing diagnostic output
- Author email
- Opportunity creation
- Flow D activation
- Historical row processing

Human review remains required. Any future author-facing system email must still copy or internally mirror to `publishing@jmerrill.one`, and the send event must be logged in Dataverse.

---

## 17. PR #89 - Human Review Decision Model

PR #89 introduces an internal-only human review decision model for persisted Stage 0 diagnostic results.

The decision model defines what an internal reviewer may decide after a safe diagnostic result has been persisted for review. It does not send author email, draft author-facing messages, create Opportunities, activate Flow D, run diagnostics, open `JM1_AI_EXECUTION_ENABLED`, or authorize production automation.

### Supported internal decisions

| Decision | Internal meaning | Resulting internal status |
|---|---|---|
| `APPROVE_FOR_AUTHOR_DRAFT` | The diagnostic may be used to prepare an author-facing draft in a later governed PR | `APPROVED_FOR_AUTHOR_DRAFT` |
| `NEEDS_REVISION` | The diagnostic needs human correction or another internal review pass | `NEEDS_REVISION` |
| `REJECT_BLOCK` | The diagnostic should not be used unless reopened by a later governed decision | `BLOCKED` |
| `HOLD_FOR_REVIEW` | Keep the diagnostic pending for further human review | `PENDING_HUMAN_REVIEW` |

Approval for author draft is not permission to send an email. It is not permission to create an Opportunity. It is not permission to activate Flow D.

### Reviewer requirements

Human review decisions require a valid diagnostic ID, governed intake reference, current review status of `PENDING_HUMAN_REVIEW`, supported decision, and reviewer identifier. Reviewer notes are required for `NEEDS_REVISION` and `REJECT_BLOCK`; notes are optional for `APPROVE_FOR_AUTHOR_DRAFT` and `HOLD_FOR_REVIEW`.

### Internal Dataverse decision mapping

Human review decisions map only to internal review fields on `jm1pub_editorialdiagnostic`:

| Decision | `jm1_humanreviewstatus` value | Notes |
|---|---:|---|
| `APPROVE_FOR_AUTHOR_DRAFT` | `835510001` Approved for Editorial Review | Internal approval for later draft preparation only |
| `NEEDS_REVISION` | `835510003` Revise / Re-run Diagnostic | Notes required |
| `REJECT_BLOCK` | `835510004` Do Not Use AI Result | Notes required |
| `HOLD_FOR_REVIEW` | `835510000` Pending Review | Remains under internal review |

Decision updates may also set `jm1_humanreviewedby`, `jm1_humanreviewedon`, `jm1_humanreviewnotes`, `jm1_diagnosticstructuredoutputjson`, and safe correlation metadata. Decision updates must not include manuscript text, extracted manuscript content, prompt body, raw model output, author email fields, Opportunity fields, Flow D trigger fields, secrets, tokens, keys, or headers.

### Non-activation boundary

Human review decisions are internal-only at this stage. Author-facing communication remains a later governed phase. Any future author-facing system email must still copy or internally mirror to `publishing@jmerrill.one`, and the send event must be logged in Dataverse.

---

## 18. PR #90 - Author Response Draft Preparation

PR #90 introduces an internal-only author response draft preparation layer for Stage 0 diagnostic results that have been human-approved with `APPROVE_FOR_AUTHOR_DRAFT`.

Draft preparation is not sending. The draft layer prepares a safe author-facing draft for Jackie/JMP internal review, editing, and later approval under a separate governed PR. It does not send email, call a mail API, create an Opportunity, activate Flow D, run diagnostics, open `JM1_AI_EXECUTION_ENABLED`, or authorize production automation.

### Draft preconditions

The draft builder may prepare a draft only when all conditions are true:

- Human review decision is `APPROVE_FOR_AUTHOR_DRAFT`.
- Review status is `APPROVED_FOR_AUTHOR_DRAFT`.
- Diagnostic ID and intake reference are present and valid.
- Safe diagnostic summary, risk flags, confidence, and `requiresHumanReview=true` are present.
- Safe author name, author email, and project title are present.
- No unsafe manuscript, prompt, raw model, send, Opportunity, Flow D, secret, token, key, or header fields are present.

### Draft template

The first supported internal template is `INITIAL_DIAGNOSTIC_REVIEW_NEXT_STEP`.

The draft payload includes `sendStatus=DRAFT_ONLY`, `approvalStatus=PENDING_HUMAN_APPROVAL`, `internalVisibilityMailbox=publishing@jmerrill.one`, safe diagnostic identifiers, safe author/project fields, safe diagnostic summary/risk/confidence fields, and safe correlation/execution metadata if available.

The draft body uses careful J Merrill Publishing language. It thanks the author, confirms receipt, says the project has completed an initial internal editorial review, avoids acceptance guarantees, avoids package or pricing recommendations, avoids saying AI made the decision, avoids "rejected", and states that a human team member will review before final next steps.

### Non-send boundary

PR #90 does not authorize:

- Sending the draft
- Creating a send event
- Author-facing automation
- Opportunity creation
- Flow D activation
- Diagnostic execution
- Production activation

Human approval remains required before any author-facing email. Any future send must copy or internally mirror to `publishing@jmerrill.one`, and the send event must be logged in Dataverse.

---

## 20. PR #92 - Author Draft Dataverse Field Map

PR #92 defines the Dataverse field map for internal author-response drafts prepared by PR #90 and handled by the PR #91 persistence adapter.

This is a field-map and schema confirmation step only. It does not send author email, create a send event, create an Opportunity, activate Flow D, run diagnostics, open `JM1_AI_EXECUTION_ENABLED`, or authorize production automation.

### Target table

Author-response drafts remain attached to the existing Stage 0 Editorial Diagnostic record:

| Target | Value |
|---|---|
| Table logical name | `jm1pub_editorialdiagnostic` |
| Entity set | `jm1pub_editorialdiagnostics` |
| Row identity | Existing `jm1pub_editorialdiagnosticid` row identified by `diagnosticId` |

No new Dataverse table is introduced by PR #92.

### Author draft field map

These logical names are the required schema fields for internal author-draft persistence. If any field is not yet present in Dataverse, it must be created or confirmed in a later governed schema PR before live production writes are enabled.

| Draft payload item | Dataverse logical field | Required value or rule |
|---|---|---|
| `draftSubject` | `jm1_authordraftsubject` | Safe draft subject only |
| `draftBody` | `jm1_authordraftbody` | Safe draft body only; not sent by this step |
| `templateName` | `jm1_authordrafttemplate` | `INITIAL_DIAGNOSTIC_REVIEW_NEXT_STEP` |
| `sendStatus` | `jm1_authordraftsendstatus` | `DRAFT_ONLY` |
| `approvalStatus` | `jm1_authordraftapprovalstatus` | `PENDING_HUMAN_APPROVAL` |
| `internalVisibilityMailbox` | `jm1_authorvisibilitymailbox` | `publishing@jmerrill.one` |
| `futureSendRequiresInternalCopy` | `jm1_authorfuturesendrequiresinternalcopy` | `true` |
| `futureSendRequiresDataverseLog` | `jm1_authorfuturesendrequiresdataverselog` | `true` |
| `preparedAt` | `jm1_authordraftpreparedon` | Internal draft preparation timestamp |
| `preparedBy` | `jm1_authordraftpreparedby` | Internal preparer identifier |
| `approvedBy` | `jm1_authordraftapprovedby` | Empty until human approval occurs |
| `approvedOn` | `jm1_authordraftapprovedon` | Empty until human approval occurs |
| `approvalNotes` | `jm1_authordraftapprovalnotes` | Human approval/revision notes only |

Safe author email, author name, and project title should continue to use already-governed intake or diagnostic metadata fields where present. PR #92 does not create or imply an email send event.

### Safe values and exclusions

The field map supports only these safe workflow values:

- `templateName=INITIAL_DIAGNOSTIC_REVIEW_NEXT_STEP`
- `sendStatus=DRAFT_ONLY`
- `approvalStatus=PENDING_HUMAN_APPROVAL`
- `internalVisibilityMailbox=publishing@jmerrill.one`
- `futureSendRequiresInternalCopy=true`
- `futureSendRequiresDataverseLog=true`

The field map must not persist manuscript text, extracted manuscript content, prompt body, raw model output, send-now flags, sent timestamps, delivery claims, mail provider message IDs, Opportunity fields, Flow D trigger fields, secrets, tokens, keys, headers, or arbitrary external file URLs beyond already-governed safe asset references.

### Governance status

- Production activation remains unauthorized.
- `JM1_AI_EXECUTION_ENABLED=false`.
- No diagnostic run occurred.
- No author-facing output is authorized.
- No author email is authorized.
- No Opportunity creation is authorized.
- Flow D activation is not authorized.
- Drafts remain `DRAFT_ONLY`.
- Draft approval remains `PENDING_HUMAN_APPROVAL`.
- Future author-facing system email must copy or internally mirror to `publishing@jmerrill.one` and log the send event in Dataverse.

---

## 22. PR #94 - Author Draft Live Persistence Enablement

PR #94 enables live Dataverse persistence for internal author-response drafts only.

The live write target is the existing `jm1pub_editorialdiagnostic` row addressed through entity set `jm1pub_editorialdiagnostics` and row identity `jm1pub_editorialdiagnosticid`. The update payload writes only the confirmed author-draft fields created in PR #93.

### Persistence boundary

Author draft persistence remains internal-only:

- Persisted draft does not mean sent.
- `sendStatus=DRAFT_ONLY`.
- `approvalStatus=PENDING_HUMAN_APPROVAL`.
- `internalVisibilityMailbox=publishing@jmerrill.one`.
- `futureSendRequiresInternalCopy=true`.
- `futureSendRequiresDataverseLog=true`.
- `approvedBy=null`.
- `approvedOn=null`.

The live persister updates an existing Editorial Diagnostic record when explicitly called with a validated safe draft payload and a valid Dataverse client. PR #94 does not add broad automatic invocation from Flow D or the diagnostic runner.

### Non-activation status

- No author email is sent.
- No send event is created.
- No Opportunity is created.
- Flow D remains inactive.
- Production activation remains unauthorized.
- `JM1_AI_EXECUTION_ENABLED=false`.
- Future author-facing system email must copy or internally mirror to `publishing@jmerrill.one` and log the send event in Dataverse.

---

## 23. PR #95 - Author Draft Human Approval Decision Model

PR #95 introduces the internal human approval decision model for persisted author-response drafts.

Human reviewers may make only these internal decisions while a draft is `PENDING_HUMAN_APPROVAL` and `DRAFT_ONLY`:

- `APPROVE_FOR_SEND_PREPARATION`
- `NEEDS_DRAFT_REVISION`
- `REJECT_DRAFT`
- `HOLD_DRAFT_REVIEW`

### Status mapping

| Decision | Internal approval status |
|---|---|
| `APPROVE_FOR_SEND_PREPARATION` | `APPROVED_FOR_SEND_PREPARATION` |
| `NEEDS_DRAFT_REVISION` | `NEEDS_DRAFT_REVISION` |
| `REJECT_DRAFT` | `DRAFT_REJECTED` |
| `HOLD_DRAFT_REVIEW` | `PENDING_HUMAN_APPROVAL` |

All decisions preserve `sendStatus=DRAFT_ONLY`.

### Non-send boundary

Approval for send preparation does not send the email, create a send event, create an Opportunity, activate Flow D, run a diagnostic, or authorize production automation.

Reviewer notes are required when the decision is `NEEDS_DRAFT_REVISION` or `REJECT_DRAFT`. Notes are optional for `APPROVE_FOR_SEND_PREPARATION` and `HOLD_DRAFT_REVIEW`.

Future author-facing communication remains a later governed phase. Any future send must copy or internally mirror to `publishing@jmerrill.one`, and the send event must be logged in Dataverse.

---

## 19. PR #91 - Author Draft Persistence for Human Approval

PR #91 introduces an internal author-response draft persistence adapter for safe drafts prepared by PR #90.

Draft persistence is not sending. A persisted draft remains internal-only and pending human approval. It does not create a send event, send author email, create an Opportunity, activate Flow D, run diagnostics, open `JM1_AI_EXECUTION_ENABLED`, or authorize production automation.

### Persistence target and schema boundary

The preferred internal review home remains the existing `jm1pub_editorialdiagnostic` record. PR #91 does not create a new Dataverse table.

Exact author-draft Dataverse fields are not yet confirmed. PR #91 therefore uses an injected persistence adapter with tests and prepares a safe author-draft record for a later governed schema/adapter PR. The future schema/adapter PR must confirm where `draftSubject`, `draftBody`, `templateName`, `sendStatus`, `approvalStatus`, visibility-copy requirements, and safe draft metadata are stored before any live write is wired.

### Safe draft fields prepared for persistence

The adapter may persist only:

- `diagnosticId`
- `intakeReferenceCode`
- `authorName`
- `authorEmail`
- `projectTitle`
- `draftSubject`
- `draftBody`
- `templateName=INITIAL_DIAGNOSTIC_REVIEW_NEXT_STEP`
- `sendStatus=DRAFT_ONLY`
- `approvalStatus=PENDING_HUMAN_APPROVAL`
- `internalVisibilityMailbox=publishing@jmerrill.one`
- `preparedAt`
- `preparedBy`
- safe diagnostic summary, risk flags, confidence, review status, and human-review flag
- safe correlation/execution metadata
- `futureSendRequiresInternalCopy=true`
- `futureSendRequiresDataverseLog=true`

### Fail-closed and safety boundary

Persistence refuses to write if the draft payload is missing, identifiers are missing or malformed, author email is missing, subject/body are empty, template/status/approval/visibility values are wrong, future internal copy or Dataverse send-log requirements are missing, unsafe fields are present, the Dataverse client is missing, or the write fails.

The persisted draft must not contain manuscript text, extracted manuscript content, prompt body, raw model output, send-now flags, sent timestamps, sent/delivery claims, mail provider message IDs, Opportunity fields, Flow D trigger fields, secrets, tokens, keys, headers, or arbitrary external file URLs beyond already-governed safe references.

Human approval remains required before any author-facing email. Any future send must copy or internally mirror to `publishing@jmerrill.one`, and the send event must be logged in Dataverse.

---

## 21. PR #93 - Author Draft Dataverse Schema Confirmation

PR #93 documents and confirms the live Dataverse schema required before internal author-response draft persistence can be enabled.

This is schema confirmation and documentation only. It does not send author email, create a send event, create an Opportunity, activate Flow D, run diagnostics, open `JM1_AI_EXECUTION_ENABLED`, or authorize production automation.

### Required schema target

| Target | Value |
|---|---|
| Table logical name | `jm1pub_editorialdiagnostic` |
| Entity set | `jm1pub_editorialdiagnostics` |
| Row identity | Existing `jm1pub_editorialdiagnosticid` row identified by `diagnosticId` |

The required author-draft columns are confirmed created and published on the existing Stage 0 Editorial Diagnostic record. No new Dataverse table is introduced.

### Required schema fields

The required fields are documented in `docs/operations/int-pub-005-author-draft-dataverse-schema.md` and represented in `authorDraftSchemaManifest.js`.

The fields are confirmed created and added to the `JM1_Publishing` solution:

- `jm1_authordraftsubject`
- `jm1_authordraftbody`
- `jm1_authordrafttemplate`
- `jm1_authordraftsendstatus`
- `jm1_authordraftapprovalstatus`
- `jm1_authorvisibilitymailbox`
- `jm1_authorfuturesendrequiresinternalcopy`
- `jm1_authorfuturesendrequiresdataverselog`
- `jm1_authordraftpreparedon`
- `jm1_authordraftpreparedby`
- `jm1_authordraftapprovedby`
- `jm1_authordraftapprovedon`
- `jm1_authordraftapprovalnotes`

### Governance status

- Field schema is confirmed, but live author-draft persistence still requires a later governed adapter activation PR.
- Production activation remains unauthorized.
- `JM1_AI_EXECUTION_ENABLED=false`.
- No diagnostic run occurred.
- No author-facing output is authorized.
- No author email is authorized.
- No Opportunity creation is authorized.
- Flow D activation is not authorized.
- Future author-facing system email must copy or internally mirror to `publishing@jmerrill.one` and log the send event in Dataverse.
