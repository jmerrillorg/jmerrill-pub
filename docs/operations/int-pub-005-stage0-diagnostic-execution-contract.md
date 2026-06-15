# INT-PUB-005 Stage 0 Diagnostic Execution Contract

## Purpose

This document records the governed execution contract for INT-PUB-005 Stage 0 diagnostics. It defines what Flow D is permitted to do, what it is prohibited from doing, and what must be confirmed before AI execution is allowed to proceed.

## Flow D Identity

- Flow name: `INT-PUB-005 Stage 0 Diagnostic Execution`
- Flow ID: `bad14262-9068-f111-a826-000d3a14673b`
- Status: active, `statecode: 1`, `statuscode: 2`
- Solution: `JM1_Publishing`
- Purpose: detect a fresh INT-PUB-005 Stage 0 diagnostic handoff and mark diagnostic execution as deferred with human review required until the manuscript asset attachment and a side-effect-free AI execution contract are approved.

Flow D is intentionally separate from Flow C. Flow C creates the Publishing Intake Stage 0 handoff record. Flow D owns execution readiness and does not overlap with Flow C responsibilities.

## Trigger Condition

Flow D triggers on new or modified Editorial Diagnostic rows that match all of the following:

```text
@and(
  startsWith(triggerOutputs()?['body/jm1pub_name'], 'INT-PUB-005 Stage 0 Handoff'),
  equals(triggerOutputs()?['body/jm1pub_diagnosticreason'], 196650000),
  equals(triggerOutputs()?['body/jm1pub_diagnosticstatus'], 196650000),
  or(
    equals(triggerOutputs()?['body/jm1_diagnosticexecutionstatus'], null),
    equals(triggerOutputs()?['body/jm1_diagnosticexecutionstatus'], 835500000),
    equals(triggerOutputs()?['body/jm1_diagnosticexecutionstatus'], 835500005)
  ),
  or(
    equals(triggerOutputs()?['body/jm1_diagnosticattemptcount'], null),
    less(triggerOutputs()?['body/jm1_diagnosticattemptcount'], 1)
  )
)
```

## Duplicate Guard

Flow D re-reads the Editorial Diagnostic record at the start of each run. If any of the following conditions are true, the flow terminates succeeded without taking action:

- `jm1_diagnosticexecutionstatus` is `835500002` (Completed)
- `jm1_diagnosticexecutioncompletedon` is populated
- Completed output already exists with a completed execution status

Flow D does not retry after the first readiness or deferred attempt unless the retry threshold is explicitly changed.

## Diagnostic Execution Fields

These fields are confirmed on the `jm1pub_editorialdiagnostic` table and are the source of truth for Flow D execution state.

| Display name | Logical name | Type | Values |
|---|---|---|---|
| Diagnostic Execution Status | `jm1_diagnosticexecutionstatus` | Choice | `835500000` Ready; `835500001` Processing; `835500002` Completed; `835500003` Exception; `835500004` Needs Human Review; `835500005` Deferred |
| Diagnostic Execution Started On | `jm1_diagnosticexecutionstartedon` | DateTime | User local date and time |
| Diagnostic Execution Completed On | `jm1_diagnosticexecutioncompletedon` | DateTime | User local date and time |
| Diagnostic Execution Error | `jm1_diagnosticexecutionerror` | Multiple lines of text | Max length 2000 |
| Diagnostic Attempt Count | `jm1_diagnosticattemptcount` | Whole number | Minimum 0; maximum 2147483647 |
| Diagnostic Last Attempt On | `jm1_diagnosticlastattempton` | DateTime | User local date and time |
| Diagnostic Output Summary | `jm1_diagnosticoutputsummary` | Multiple lines of text | Max length 2000 |
| Diagnostic Recommendation | `jm1_diagnosticrecommendation` | Multiple lines of text | Max length 2000 |
| Diagnostic Confidence | `jm1_diagnosticconfidence` | Decimal | Precision 2; minimum 0; maximum 1 |
| Diagnostic Requires Human Review | `jm1_diagnosticrequireshumanreview` | Yes/No | `false` No; `true` Yes |
| Diagnostic Model / Agent ID | `jm1_diagnosticagentid` | Single line of text | Max length 100 |
| Diagnostic Correlation ID | `jm1_diagnosticcorrelationid` | Single line of text | Max length 100 |

## Editorial Diagnostic Table Reference

- Display name: `Editorial Diagnostic`
- Logical name: `jm1pub_editorialdiagnostic`
- Entity set: `jm1pub_editorialdiagnostics`

Existing handoff status field: `jm1pub_diagnosticstatus`

Existing handoff status values:

| Value | Label |
|---|---|
| `196650000` | Pending |
| `196650001` | In Progress |
| `196650002` | Complete |
| `196650003` | Auto-Routed |
| `196650004` | Awaiting Jackie Review |
| `196650005` | Jackie Approved |
| `196650006` | Jackie Redirected |
| `196650007` | Declined |
| `196650008` | Hard Stop |

Existing handoff reason field: `jm1pub_diagnosticreason`

Existing handoff reason value used by Flow C: `196650000` Initial

Existing output fields include `jm1pub_diagnosticsummary`, `jm1pub_diagnosticjson`, `jm1pub_airawresponse`, `jm1pub_aiconfidencescore`, `jm1pub_confidence`, `jm1pub_editorialrecommendation`, `jm1pub_recommendedpackage`, and routing and review fields.

Existing references include `jm1pub_publishingintake`, `jm1pub_lead`, optional `jm1pub_authorcontact`, and optional `jm1pub_project`.

Existing Execution Log lookup: `jm1pub_executionlogentry`.

## AI Execution Contract Status

An existing AI assessment flow was found:

- Flow name: `JM1 PUB - Run Diagnostic AI Assessment`
- Flow ID: `56d5901d-874b-f111-bec7-6045bdd69678`
- Status: active

An existing prompt template was found:

- Name: `Stage 0 Editorial Diagnostic`
- Prompt type: `196650000`
- Prompt version: `v1.0.0`
- Model deployment alias: `jm1-pub-diagnostic-primary`
- JSON schema version: `v1.0.0`

Existing environment-variable contract names are confirmed for the Azure OpenAI endpoint, key, API version, and deployment alias.

**Flow D does not call the existing AI assessment flow.** That flow includes Opportunity creation and Execution Log actions that are outside the approved INT-PUB-005 Flow D scope.

**Flow D does not call Foundry, Azure OpenAI, OpenAI, or any AI endpoint.**

Flow D marks diagnostics as `Deferred` (`835500005`) with `Diagnostic Requires Human Review = true` until the following are confirmed:

1. Manuscript asset attachment is confirmed.
2. A side-effect-free AI execution contract is approved.

## Controlled Test Status

- No Flow D controlled `/join` test was run in this pass.
- Reason: the AI execution contract is not confirmed for INT-PUB-005. The only discovered diagnostic execution flow has disallowed side effects.
- No historical Publishing Intake rows were processed.

## Execution Log Behavior

Execution Log writes are deferred for Flow D. The execution-log contract was not confirmed for this governed pass. Flow D uses the diagnostic execution fields on `jm1pub_editorialdiagnostic` as the source of truth.

## Boundaries

The following actions are prohibited for Flow D:

- No Opportunity creation.
- No author email send.
- No historical row processing.
- No duplicate completed diagnostic execution.
- No uncontrolled AI execution.
- No full prompt text, full manuscript text, endpoint key, header, token, cookie, or secret is logged or stored.

## Manuscript Asset Path

### Storage and truth layer

- Storage: SharePoint (`Publishing Team` site)
- Truth layer: Dataverse (`jm1pub_editorialdiagnostic`)
- SharePoint stores the file. Dataverse stores asset status, URL, filename, file type, attached/approved metadata, and the approval flag.

### File location before active project

```
Publishing Team / Documents / 01_Pre-Pipeline / 01_Manuscript-Review / 00_Intake-Manuscripts / [Intake Reference Code] / Original
```

Optional internal subfolders under each intake reference code:

| Subfolder | Purpose |
|---|---|
| `Original` | Manuscript file as received from author |
| `Converted` | Format-converted version for internal processing |
| `Notes` | Operator notes related to the manuscript |

### File location after project becomes active

```
Publishing Team / Documents / 02_Active-Pipeline / [Author or Project Folder] / 03_Manuscript
```

Moving or copying to the active-pipeline path requires Jackie's explicit authorization.

### Attachment method

An internal operator saves the manuscript file from email into the SharePoint path above, then updates the Editorial Diagnostic record with the SharePoint asset URL and metadata. No public upload mechanism exists. No author-facing upload is permitted.

### Approval

Jackie or an assigned editorial operator explicitly approves the manuscript asset for diagnostic execution by setting:

- `jm1_manuscriptassetstatus` = Approved
- `jm1_manuscriptapprovedfordiagnostic` = Yes

## Manuscript Asset Fields on Editorial Diagnostic

These fields are confirmed created and published on the `jm1pub_editorialdiagnostic` table in the `JM1_Publishing` solution. Created 2026-06-15. Table published after creation.

| Display name | Logical name | Type | Specification | Status |
|---|---|---|---|---|
| Manuscript Asset Status | `jm1_manuscriptassetstatus` | Choice | `0` Missing; `1` Received; `2` Attached; `3` Approved; `4` Exception | Created |
| Manuscript Asset URL | `jm1_manuscriptasseturl` | Single line of text | Max length 500; stores SharePoint file URL | Created |
| Manuscript File Name | `jm1_manuscriptfilename` | Single line of text | Max length 255 | Created |
| Manuscript File Type | `jm1_manuscriptfiletype` | Single line of text | Max length 50 (e.g. `docx`, `pdf`) | Created |
| Manuscript Attached On | `jm1_manuscriptattachedon` | DateTime | User local date and time | Created |
| Manuscript Attached By | `jm1_manuscriptattachedby` | Single line of text | Max length 100; operator name or system user identifier | Created |
| Manuscript Approved for Diagnostic | `jm1_manuscriptapprovedfordiagnostic` | Yes/No | Default: No | Created |
| Manuscript Approved On | `jm1_manuscriptapprovedon` | DateTime | User local date and time | Created |
| Manuscript Asset Notes | `jm1_manuscriptassetnotes` | Multiple lines of text | Max length 2000 | Created |

### Choice values for Manuscript Asset Status (`jm1_manuscriptassetstatus`)

| Label | Value |
|---|---|
| Missing | `0` |
| Received | `1` |
| Attached | `2` |
| Approved | `3` |
| Exception | `4` |

## Flow D AI Gate

Flow D may execute AI only when all three conditions are true:

| Condition | Required value |
|---|---|
| `jm1_manuscriptassetstatus` | `3` (Approved) |
| `jm1_manuscriptapprovedfordiagnostic` | `true` (Yes) |
| `jm1_manuscriptasseturl` | populated (not null or empty) |

If any condition is not met, Flow D must:

- Set `jm1_diagnosticexecutionstatus` to `835500005` (Deferred) or `835500004` (Needs Human Review)
- Set `jm1_diagnosticrequireshumanreview` to `true`
- Set `jm1_diagnosticexecutionerror` to: `Manuscript asset not attached or not approved.`

Flow D behavior is not changed in this pass. The gate rule is documented here for the next governed implementation pass.

## What Must Be Confirmed Before AI Execution

AI execution in Flow D is blocked until all of the following are confirmed and documented:

1. Manuscript asset is saved to SharePoint at the correct intake path and the URL is populated in `jm1_manuscriptasseturl` on the Editorial Diagnostic record.
2. `jm1_manuscriptassetstatus` is set to `Approved` and `jm1_manuscriptapprovedfordiagnostic` is set to `Yes` by Jackie or an assigned editorial operator.
3. A side-effect-free AI execution contract is written, reviewed, and approved. The contract must confirm that the AI call produces no Opportunity creation, no email send, no Execution Log write, and no other side effect outside the diagnostic output fields.
4. The confirmed contract is linked from this document and the flow solution component is updated to reflect the approved scope.

Until these are confirmed, Flow D sets `jm1_diagnosticexecutionstatus` to `835500005` (Deferred) and `jm1_diagnosticrequireshumanreview` to `true`.
