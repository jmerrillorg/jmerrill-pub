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
