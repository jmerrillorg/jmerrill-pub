# INT-PUB-005 Stage 0 Diagnostic AI Execution Contract

## 1. Purpose

This contract governs the future side-effect-free AI execution path for INT-PUB-005 Stage 0 diagnostics. It defines the boundary, inputs, outputs, manuscript handling, prompt governance, logging, and human review requirements that must be satisfied before Flow D's true branch may call any AI service.

This document does not authorize AI execution. Implementation requires Jackie's explicit approval after all open decisions below are resolved.

## 2. Current State

- Flow D is active. It enforces the manuscript asset gate: `jm1_manuscriptassetstatus = Approved`, `jm1_manuscriptapprovedfordiagnostic = true`, `jm1_manuscriptasseturl` populated.
- When the gate passes, Flow D currently routes to the AI-gate deferred path. The true branch — AI execution — is not yet implemented.
- The existing flow `JM1 PUB - Run Diagnostic AI Assessment` (ID `56d5901d-874b-f111-bec7-6045bdd69678`) is not reused as-is. See Section 12 for the assessment.
- No AI execution is authorized at this time.

## 2b. Activation Decision Record

The resolved activation design decisions — including canonical identifier mapping, prompt governance, grounding dependencies, manuscript boundary, confidence thresholds, output storage, logging contract, human review model, no-quotation discipline, and Legacy exclusion — are documented in:

[`docs/operations/int-pub-005-stage0-diagnostic-ai-activation-decision-record.md`](./int-pub-005-stage0-diagnostic-ai-activation-decision-record.md)

Key resolved items:

| Item | Resolution |
|---|---|
| Canonical prompt template ID | `jm1-prompt-pub-stage0-diagnostic` |
| Operational alias / version code | `PUB-STAGE0-DIAGNOSTIC-V1` |
| Agent ID | `jm1-agent-pub-diagnostic-01` |
| Canonical AI metadata log | `jm1_airequestlogs` entity set (table: `jm1_airequestlog`), canonical across JM1 Publishing AI agents |
| Summary-field no-quotation rule | `jm1_diagnosticoutputsummary` and all output/log fields must characterize only — never quote manuscript |
| Legacy exclusion | Legacy-flagged intakes blocked from this runner path; deferred until a separate Legacy diagnostic path is approved |
| Real AI | Still disabled. `CONTRACT_TEST_MODE=true`. |

## 2a. Approved Architecture

**Decision:** Jackie approved the use of a new, isolated Azure Function for diagnostic-only AI execution.

**Architecture:** Flow D calls the `jm1-diagnostic-ai-runner` Azure Function via HTTP after the manuscript asset gate passes. The function performs the controlled diagnostic AI call. Dataverse stores the result via a Flow D PATCH action after the function returns.

**Current function status:** Contract-test mode. `CONTRACT_TEST_MODE = true`. The function validates the request contract and returns HTTP 202 with a safe confirmation. No AI call is made.

**Function path:** `azure-functions/diagnostic-ai-runner/`

**Route:** `POST /api/run-stage0-diagnostic`

**Full function specification:** [`docs/operations/int-pub-005-stage0-diagnostic-ai-runner-azure-function.md`](./int-pub-005-stage0-diagnostic-ai-runner-azure-function.md)

## 3. Execution Boundary

### Permitted

The future AI execution path may:

- Read the Editorial Diagnostic row
- Read safe linked Publishing Intake metadata (reference code, project title, work type, intake channel)
- Read the approved manuscript asset from the governed SharePoint location
- Call the approved diagnostic-only AI service using an approved prompt template
- Store diagnostic results back on the Editorial Diagnostic record using approved output fields
- Set human review status on the Editorial Diagnostic record
- Write to the approved AI Request Log and Execution Log tables

### Prohibited

The future AI execution path must not:

- Create an Opportunity
- Update Lead stage or Lead disposition
- Send any author-facing email
- Select, commit, or reference a publishing package
- Commit contract terms of any kind
- Process historical Publishing Intake rows
- Call any flow not explicitly approved for this path
- Expose raw manuscript text in execution logs, Dataverse fields, or API responses
- Store raw full manuscript text in any Dataverse field
- Call `JM1 PUB - Run Diagnostic AI Assessment` as a child flow

## 4. Approved Input Contract

The following inputs are approved for the AI execution call:

| Input | Source | Notes |
|---|---|---|
| Editorial Diagnostic ID | Flow D trigger record | Primary key; drives all reads and writes |
| Publishing Intake reference code | `jm1_intakereferencecode` on Publishing Intake | Used for context and logging correlation |
| Author / project context | Safe metadata fields from Publishing Intake | Work type, genre, manuscript status at intake — no author PII beyond what diagnostic context requires |
| Manuscript asset URL | `jm1_manuscriptasseturl` on Editorial Diagnostic | SharePoint URL; passed only after gate passes |
| Manuscript file type | `jm1_manuscriptfiletype` on Editorial Diagnostic | e.g. `docx`, `pdf` |
| Manuscript approved flag | `jm1_manuscriptapprovedfordiagnostic` on Editorial Diagnostic | Must be `true` before use |
| Manuscript asset status | `jm1_manuscriptassetstatus` on Editorial Diagnostic | Must be `3` (Approved) before use |
| Diagnostic correlation ID | `jm1_diagnosticcorrelationid` on Editorial Diagnostic | Used for log correlation |

Inputs that are not approved:

- Raw manuscript file content passed inline in a Dataverse field
- Author personal contact details beyond what the prompt requires for context
- Any field from another author's or project's record

## 5. Manuscript Handling Contract

- The manuscript file remains in SharePoint at the governed path:
  ```
  Publishing Team / Documents / 01_Pre-Pipeline / 01_Manuscript-Review / 00_Intake-Manuscripts / [Intake Reference Code] / Original
  ```
- AI execution may read the file only after the gate passes (status = Approved, approved flag = true, URL populated).
- Raw manuscript content must not be committed to the repository at any time.
- Raw manuscript content must not be stored in execution logs, AI request logs, or any Dataverse field used for logging or audit.
- Any extracted or converted text used during AI execution is transient. It must not be persisted unless a separate retention contract is approved.
- If format conversion is needed before AI execution (e.g. PDF to plain text), the converted file is stored under:
  ```
  Publishing Team / Documents / 01_Pre-Pipeline / 01_Manuscript-Review / 00_Intake-Manuscripts / [Intake Reference Code] / Converted
  ```
- Converted files are internal operator assets. They are not author-facing.

## 6. Prompt / Template Governance

Prompt text must come from an approved governed source before implementation begins. No hard-coded production prompt text may appear in Flow D or any child flow.

**Resolved:** Dataverse AI Prompt Template table (`jm1pub_aiprompttemplates`, logical name `jm1pub_aiprompttemplate`). Canonical governance shell record created 2026-06-16:

| Field | Value |
|---|---|
| Record ID | `ef8acd4f-6869-f111-a826-000d3a14673b` |
| `jm1pub_promptkey` | `jm1-prompt-pub-stage0-diagnostic` |
| `jm1pub_promptname` | `Stage 0 Editorial Diagnostic` |
| `jm1pub_promptversion` | `PUB-STAGE0-DIAGNOSTIC-V1` |
| `jm1pub_modeldeploymentalias` | `jm1-pub-diagnostic-primary` |
| `jm1pub_groundingdependencies` | `knowledge.md` |
| `jm1pub_active` | `false` — inactive until Jackie approves activation |

The chosen approach must:

- Track prompt name and version in every AI Request Log entry
- Not embed raw manuscript content in the prompt commit
- Be auditable: version in use at the time of any execution is recoverable

## 7. Output Storage Contract

Results are written back to the Editorial Diagnostic record using existing confirmed fields. No new Dataverse fields are to be created in this pass unless Jackie explicitly approves.

| Display name | Logical name | Purpose |
|---|---|---|
| Diagnostic Output Summary | `jm1_diagnosticoutputsummary` | Human-readable diagnostic summary from AI |
| Diagnostic Recommendation | `jm1_diagnosticrecommendation` | AI recommendation text |
| Diagnostic Confidence | `jm1_diagnosticconfidence` | Confidence score (decimal, 0–1) |
| Diagnostic Requires Human Review | `jm1_diagnosticrequireshumanreview` | Set to `true` on all Stage 0 results |
| Diagnostic Execution Status | `jm1_diagnosticexecutionstatus` | Set to `Completed` or `Needs Human Review` |
| Diagnostic Execution Started On | `jm1_diagnosticexecutionstartedon` | UTC timestamp when execution began |
| Diagnostic Execution Completed On | `jm1_diagnosticexecutioncompletedon` | UTC timestamp when execution completed |
| Diagnostic Execution Error | `jm1_diagnosticexecutionerror` | Error detail on `Exception` status |
| Diagnostic Attempt Count | `jm1_diagnosticattemptcount` | Incremented each attempt |
| Diagnostic Last Attempt On | `jm1_diagnosticlastattempton` | UTC timestamp of last attempt |
| Diagnostic Model / Agent ID | `jm1_diagnosticagentid` | Model or agent identifier used |
| Diagnostic Correlation ID | `jm1_diagnosticcorrelationid` | Correlation key for log matching |

If the AI result schema requires additional fields (e.g. genre confidence, copyright risk signal, or recommended package code), those fields will be listed as planned here and created only with Jackie's explicit approval:

- None planned at this time.

## 8. Status Mapping

| Status | Code | Condition |
|---|---|---|
| Processing | `835500001` | Set when execution begins; reverted to Deferred or Exception if flow fails |
| Completed | `835500002` | Set when diagnostic result is parsed and stored successfully |
| Needs Human Review | `835500004` | Set when confidence is below threshold or model flags an issue requiring review |
| Exception | `835500003` | Set when AI call or result parsing fails; `jm1_diagnosticexecutionerror` is populated |
| Deferred | `835500005` | Set when manuscript gate is not passed (current behavior) |

All Stage 0 diagnostic results — including Completed — require human review before any next-stage movement. `jm1_diagnosticrequireshumanreview` is always set to `true` on any Stage 0 result.

## 9. Human Review Gate

- All Stage 0 AI diagnostics are advisory only.
- No author-facing decision is made automatically.
- No next-stage action (Opportunity creation, package selection, contract commitment) is triggered automatically by a Completed diagnostic.
- Jackie or an assigned editorial operator reviews the diagnostic result before any next-stage movement.
- The handoff status `jm1pub_diagnosticstatus` is set to `Awaiting Jackie Review` (`196650004`) after a successful diagnostic execution.

**Open decision:** confidence threshold below which status is set to `Needs Human Review` rather than `Completed`. No threshold is defined in this pass.

## 10. Execution Log / AI Request Log Contract

### What is logged

| Category | Log target |
|---|---|
| Request metadata (prompt name, version, model, deployment alias) | `jm1_airequestlogs` |
| Request timestamps (sent, received) | `jm1_airequestlogs` |
| Response status (success, error, JSON valid flag) | `jm1_airequestlogs` |
| Token usage (input and output token counts) | `jm1_airequestlogs` |
| Correlation ID | `jm1_airequestlogs` and `jm1_executionlogs` |
| Human decision status | `jm1_executionlogs` |
| Execution lifecycle (started, completed, error) | `jm1_executionlogs` |

### What is not logged

- Raw manuscript text in any log field
- Full prompt text including manuscript content
- Secrets, endpoint keys, tokens, or cookies
- Author PII beyond what is already in the diagnostic record

### Open decision

Whether the first implementation writes to `jm1_airequestlogs`, `jm1_executionlogs`, or both. The existing `JM1 PUB - Run Diagnostic AI Assessment` flow writes to both. If Flow D implements its own AI call, it should write to both tables with the same field contract used by the existing flow.

## 11. Flow D True Branch — Future High-Level Design

The following is the intended sequence for the unimplemented true branch of `Condition_Manuscript_Asset_Ready` in Flow D. This is a design reference only — not an implementation spec.

1. Confirm manuscript gate (already gated by `Condition_Manuscript_Asset_Ready`)
2. Set `jm1_diagnosticexecutionstatus` = `835500001` (Processing) and `jm1_diagnosticexecutionstartedon` = `utcNow()`
3. Create AI Request Log entry (pending)
4. Resolve manuscript asset from SharePoint using `jm1_manuscriptasseturl`
5. Resolve approved prompt template (version-controlled)
6. Call diagnostic-only AI service (no Opportunity, no email, no side effects)
7. Parse and validate the AI JSON response
8. Update AI Request Log entry (response payload, token counts, status)
9. Update Editorial Diagnostic with diagnostic result fields
10. Set `jm1_diagnosticexecutionstatus` to `835500002` (Completed) or `835500004` (Needs Human Review) based on confidence threshold
11. Set `jm1_diagnosticrequireshumanreview` = `true`
12. Set `jm1pub_diagnosticstatus` = `196650004` (Awaiting Jackie Review)
13. Create Execution Log entry (completed)
14. Terminate cleanly with status Succeeded

On any exception:

1. Set `jm1_diagnosticexecutionstatus` = `835500003` (Exception)
2. Populate `jm1_diagnosticexecutionerror` with safe error detail (no secrets, no manuscript content)
3. Create Execution Log entry (exception)
4. Terminate cleanly with status Succeeded

## 12. Existing Flow Assessment — JM1 PUB - Run Diagnostic AI Assessment

Flow ID: `56d5901d-874b-f111-bec7-6045bdd69678`  
Trigger type: Manual (HTTP `Request` trigger — child flow invocation)  
State: Active

### Tables touched

| Table | Entity set | Operations | Notes |
|---|---|---|---|
| Editorial Diagnostic | `jm1pub_editorialdiagnostics` | Read, Update (multiple) | Core diagnostic record |
| Publishing Intake | `jm1_publishingintakes` | Read | Intake metadata |
| Lead | `leads` | Read | Author lead context |
| AI Prompt Template | `jm1pub_aiprompttemplates` | Read (list) | Prompt resolution |
| Opportunity | `opportunities` | **Create** | Disqualifying side effect |
| AI Request Log | `jm1_airequestlogs` | Create, Update | Logging — reusable contract |
| Execution Log | `jm1_executionlogs` | Create (multiple) | Logging — reusable contract |

### Side effects that disqualify reuse

| Side effect | Detail |
|---|---|
| **Opportunity creation** | Flow creates a CRM Opportunity linked to the originating Lead (`CreateRecord` on `opportunities`) when diagnostic routing logic fires |
| **Opportunity linking** | Flow then updates the Editorial Diagnostic to bind the new Opportunity (`item/jm1pub_Opportunity@odata.bind`) |
| **Routing logic write** | `Update_row_—_Apply_Routing_Logic` writes disposition and auto-routing fields to the diagnostic, advancing the business process state |
| **Jackie review email composition** | Flow composes a Jackie review email subject and body (`Compose_—_Jackie_Review_Email_Subject`, `Compose_—_Jackie_Review_Email_Body`) and queues a notification |
| **Estimated project value** | Flow writes `jm1pub_estimatedprojectvalue` as part of the routing update — a sales-pipeline field |

### Parts that could be reused or referenced safely later

| Pattern | Notes |
|---|---|
| AI Prompt Template lookup | `List_rows_—_Active_Prompt_Template` against `jm1pub_aiprompttemplates` — safe pattern; reusable |
| AI Request Log write pattern | Field contract on `jm1_airequestlogs` is well-defined; can be adopted directly |
| Execution Log write pattern | Field contract on `jm1_executionlogs` is well-defined; can be adopted directly |
| AI call structure | The HTTP action calling the AI endpoint is the reference; the endpoint, key, and deployment alias come from environment variables |
| Editorial Diagnostic AI metadata fields | `jm1pub_aiagentname`, `jm1pub_aimodelused`, `jm1pub_aipromptversion`, `jm1pub_airawresponse`, `jm1pub_airequesttimestamp` — these are existing `jm1pub_` prefixed fields; safe to write as part of a diagnostic result |

## 13. Open Decisions Before Build

The following decisions must be resolved and documented before any implementation of the Flow D true branch:

| Decision | Status | Notes |
|---|---|---|
| AI service endpoint / provider | Open | Azure OpenAI via environment variable, or Foundry? Deployment alias currently `jm1-pub-diagnostic-primary` per existing prompt template |
| Prompt / template source | Open | Dataverse `jm1pub_aiprompttemplates`, Foundry, or repo-held versioned file |
| Manuscript text extraction method | Open | Read file bytes from SharePoint and pass to AI? Use a conversion step? Azure Document Intelligence? |
| Manuscript conversion for non-DOCX | Open | PDF or other formats may require conversion before AI ingestion |
| Confidence threshold for Needs Human Review | Open | No threshold defined; all Stage 0 results currently require human review regardless |
| Human review status model | Open | Whether `Needs Human Review` and `Completed` are both routed to Jackie review, or whether Completed advances differently |
| Logging target | Open | `jm1_airequestlogs`, `jm1_executionlogs`, or both; recommend both per existing flow pattern |
| Child flow vs inline AI call | Open | Whether to create a new side-effect-free child flow for the AI call, or implement inline in Flow D |
| Additional Dataverse fields | Open | If genre confidence, copyright risk signal, or recommended package code are required as structured output; no fields created in this pass |
| Retry policy | Open | How many retries on AI call timeout or transient failure; current attempt-count logic supports retries |

## 14. Explicit Non-Authorization

This document does not authorize AI execution. No AI call, no Foundry call, no Azure OpenAI call, and no Power Automate flow change to implement this contract may proceed until Jackie explicitly approves implementation and all open decisions in Section 13 are resolved.

Flow D's true branch (`Condition_Manuscript_Asset_Ready` true) currently routes to a deferred update with the message `Stage 0 diagnostic execution deferred: manuscript asset approved, but side-effect-free AI execution contract not yet confirmed for INT-PUB-005.` That behavior remains in place.
