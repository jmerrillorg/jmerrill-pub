# INT-PUB-005 Stage 0 Diagnostic AI — Activation Decision Record

## 1. Purpose

This document records the resolved activation design decisions for the INT-PUB-005 Stage 0 Diagnostic AI execution path. It folds in four governance reconciliation items from the pipeline review and defines the canonical identifiers, prompt governance, grounding dependencies, manuscript boundary, confidence thresholds, output storage, logging contract, human review model, no-quotation discipline, and Legacy exclusion that must be satisfied before real AI execution is authorized.

This record does not authorize real AI execution. See Section 14.

## 2. Current Verified State

| Component | Status |
|---|---|
| INT-PUB-005 /join intake | Complete and live |
| Flow A — Contact and Lead creation | Live |
| Flow B — ACS acknowledgment email | Live |
| Flow C — Stage 0 Editorial Diagnostic handoff | Live |
| Flow D — manuscript asset gate | Live |
| Diagnostic AI Runner Azure Function (`func-jm1-diagnostic-ai-runner`) | Deployed, contract-test mode |
| Flow D → Runner integration | Live, contract-test mode |
| Real AI execution | Not enabled. `CONTRACT_TEST_MODE=true`. |

## 3. Approved Activation Decisions

| Decision | Resolved value |
|---|---|
| AI service endpoint / provider | Azure AI Foundry / Azure OpenAI Service via Diagnostic AI Runner Azure Function |
| Deployment alias — production | `jm1-pub-diagnostic-primary` |
| Deployment alias — safe test | `jm1-pub-diagnostic-safe-test` |
| Prompt / template source | Dataverse AI Prompt Template table (`jm1pub_aiprompttemplate`, entity set `jm1pub_aiprompttemplates`) |
| Canonical prompt identifier | `jm1-prompt-pub-stage0-diagnostic` |
| Operational prompt alias / version code | `PUB-STAGE0-DIAGNOSTIC-V1` |
| First-activation manuscript formats | DOCX and TXT only. PDF and scanned-file extraction deferred. |
| Manuscript extraction | Transient in Azure Function runtime memory only. Never persisted. |
| Confidence threshold — Completed | ≥ 0.85 (human review still required before any author-facing action) |
| Confidence threshold — Needs Human Review | 0.70 – 0.849 |
| Confidence threshold — Needs Human Review (low-confidence note) | < 0.70 |
| Technical failure | Exception status |
| Manuscript asset not approved | Deferred status |
| Structured output storage | Existing diagnostic fields plus `jm1_diagnosticstructuredoutputjson` and `jm1_diagnosticriskflags` |
| AI metadata log | `jm1_airequestlog` (canonical across publishing AI agents) |
| Governed business execution log | `jm1_executionlog` |
| Human review gate | Always required before any author-facing action |

## 4. Canonical Identifier Mapping

| Identifier type | Value |
|---|---|
| Agent ID | `jm1-agent-pub-diagnostic-01` |
| Canonical Prompt Template ID | `jm1-prompt-pub-stage0-diagnostic` |
| Operational Prompt Alias / Version Code | `PUB-STAGE0-DIAGNOSTIC-V1` |
| Dataverse table | `jm1pub_aiprompttemplate` (entity set: `jm1pub_aiprompttemplates`) |
| Deployment alias (production) | `jm1-pub-diagnostic-primary` |
| Deployment alias (safe test) | `jm1-pub-diagnostic-safe-test` |
| Azure Function | `func-jm1-diagnostic-ai-runner` |
| Runner route | `POST /api/run-stage0-diagnostic` |

### Mapping rule

The canonical governance ID is the `jm1-*` form. `PUB-STAGE0-DIAGNOSTIC-V1` is an operational alias and version code. Any reference in ADR-008 (agent registry), ADR-011 (prompt template governance), or the INT-PUB-005 activation contract must resolve through `jm1-prompt-pub-stage0-diagnostic` to identify the same diagnostic agent and prompt pair.

No AI call may proceed using an unregistered deployment alias or an unresolvable prompt ID.

## 5. Prompt / Template Governance

- Prompt text is stored in the Dataverse `jm1pub_aiprompttemplate` table (entity set: `jm1pub_aiprompttemplates`).
- Canonical prompt template identifier: `jm1-prompt-pub-stage0-diagnostic`
- Operational version code logged at every AI call: `PUB-STAGE0-DIAGNOSTIC-V1`
- No prompt text may be hard-coded in Flow D, the Azure Function, or any repo file.
- Every AI Request Log entry must record the prompt name and version in use at the time of execution.
- Prompt updates require a new version code. The version in use at the time of any execution must be recoverable from the AI Request Log.
- The prompt template must not embed raw manuscript content, author PII beyond diagnostic context, or production secrets.

## 6. Grounding Dependencies

The prompt template must declare grounding dependencies using the ADR-011 / BP-08 field:

**Dataverse field:** `jm1pub_groundingdependencies` on `jm1pub_aiprompttemplate` (entity set: `jm1pub_aiprompttemplates`)

Grounding dependencies must not be left implicit. The canonical diagnostic prompt `jm1-prompt-pub-stage0-diagnostic` must declare a minimum of:

| Dependency | Governed location | Purpose |
|---|---|---|
| `knowledge.md` | `stjm1diagrunner` / `knowledge` container / `knowledge.md` | Imprint definitions; scoring rubric; package categories; editorial path definitions; risk flag guidance; routing rules |

**Canonical blob URL (private):** `https://stjm1diagrunner.blob.core.windows.net/knowledge/knowledge.md`

**Access:** Azure Function managed identity (`e8c51a80-bdb0-46fa-b398-9109719d6427`) has `Storage Blob Data Reader` on `stjm1diagrunner`. The runner reads this file via `@azure/storage-blob` + `DefaultAzureCredential` at startup.

**File status:** Draft skeleton uploaded 2026-06-16. Editorial content (imprint definitions, scoring weights, package categories, editorial paths, risk guidance) not yet authored. Jackie must review and complete the file before activation.

Additional grounding dependencies (e.g. style guide, genre taxonomy) must be declared explicitly before use. Undeclared grounding is a pre-execution blocker.

## 7. Manuscript Extraction / Conversion Boundary

### Approved first-activation formats

| Format | Status |
|---|---|
| DOCX | Approved |
| TXT | Approved |
| PDF | Deferred — extraction path not approved |
| Scanned files / images | Deferred — not approved |

### Extraction rules

- Manuscript extraction is transient: it occurs in Azure Function runtime memory only.
- No extracted or converted text may be stored in Dataverse fields, execution logs, AI request logs, repo files, or any other persistent medium.
- If the manuscript file format is not DOCX or TXT, the function must return a safe error and set `jm1_diagnosticexecutionstatus` to Exception with a safe message.
- No format conversion (e.g. PDF-to-text, image OCR) may occur without a separate approved conversion boundary.

## 8. Confidence Threshold

| Result | Condition | Status written |
|---|---|---|
| Completed | Confidence ≥ 0.85 | `835500002` Completed — human review still required |
| Needs Human Review | 0.70 ≤ confidence < 0.85 | `835500004` Needs Human Review |
| Needs Human Review (low confidence) | Confidence < 0.70 | `835500004` Needs Human Review — low-confidence note written to `jm1_diagnosticexecutionerror` |
| Exception | Technical failure (API error, parse failure, timeout) | `835500003` Exception |
| Deferred | Manuscript asset gate not passed | `835500005` Deferred |

**Human review is always required** before any author-facing action, regardless of confidence score. A Completed status does not authorize Opportunity creation, author email, package recommendation, or contract movement.

## 9. Structured Output Fields

### Existing confirmed fields (use first)

| Display name | Logical name | Type |
|---|---|---|
| Diagnostic Output Summary | `jm1_diagnosticoutputsummary` | Multiple lines of text |
| Diagnostic Recommendation | `jm1_diagnosticrecommendation` | Multiple lines of text |
| Diagnostic Confidence | `jm1_diagnosticconfidence` | Decimal (0–1) |
| Diagnostic Requires Human Review | `jm1_diagnosticrequireshumanreview` | Yes/No |
| Diagnostic Execution Status | `jm1_diagnosticexecutionstatus` | Choice |
| Diagnostic Execution Started On | `jm1_diagnosticexecutionstartedon` | DateTime |
| Diagnostic Execution Completed On | `jm1_diagnosticexecutioncompletedon` | DateTime |
| Diagnostic Execution Error | `jm1_diagnosticexecutionerror` | Multiple lines of text |
| Diagnostic Attempt Count | `jm1_diagnosticattemptcount` | Whole number |
| Diagnostic Last Attempt On | `jm1_diagnosticlastattempton` | DateTime |
| Diagnostic Model / Agent ID | `jm1_diagnosticagentid` | Single line of text |
| Diagnostic Correlation ID | `jm1_diagnosticcorrelationid` | Single line of text |

### New fields created in this pass

| Display name | Logical name | Type | Max length | Created |
|---|---|---|---|---|
| Diagnostic Structured Output JSON | `jm1_diagnosticstructuredoutputjson` | Multiple lines of text | 10000 | 2026-06-16 |
| Diagnostic Risk Flags | `jm1_diagnosticriskflags` | Multiple lines of text | 2000 | 2026-06-16 |

### Human review fields created in this pass

| Display name | Logical name | Type | Notes | Created |
|---|---|---|---|---|
| Human Review Status | `jm1_humanreviewstatus` | Choice | See values below | 2026-06-16 |
| Human Reviewed By | `jm1_humanreviewedby` | Single line of text | Max 100 | 2026-06-16 |
| Human Reviewed On | `jm1_humanreviewedon` | DateTime | User local | 2026-06-16 |
| Human Review Notes | `jm1_humanreviewnotes` | Multiple lines of text | Max 2000 | 2026-06-16 |

### Human Review Status choice values

| Label | Value |
|---|---|
| Pending Review | `835510000` |
| Approved for Editorial Review | `835510001` |
| Needs Manual Editorial Review | `835510002` |
| Revise / Re-run Diagnostic | `835510003` |
| Do Not Use AI Result | `835510004` |

All six new fields are confirmed created and published on `jm1pub_editorialdiagnostic` in the `JM1_Publishing` solution. Table published 2026-06-16.

## 10. Logging Contract

### AI metadata log

**Table:** `jm1_airequestlog`

This is the canonical AI metadata log target across JM1 Publishing AI agents, unless later canon supersedes it.

| Category | Logged |
|---|---|
| Prompt name and version (`PUB-STAGE0-DIAGNOSTIC-V1`) | Yes |
| Model / deployment alias used | Yes |
| Request timestamps (sent, received) | Yes |
| Response status (success, error, JSON-valid flag) | Yes |
| Token usage (input and output counts) | Yes |
| Correlation ID | Yes |

### Governed business execution log

**Table:** `jm1_executionlog`

| Category | Logged |
|---|---|
| Execution lifecycle (started, completed, exception) | Yes |
| Human decision status | Yes |
| Correlation ID | Yes |

### What neither log may contain

- Raw manuscript text (any length or excerpt)
- Full prompt body
- Manuscript excerpts or quoted author prose
- Secrets, runner keys, endpoint keys, tokens, cookies, or headers
- Author PII beyond what is already in the diagnostic record

## 11. Human Review Approval Model

All Stage 0 diagnostic results — including Completed — require human review before any author-facing action.

No action listed below may be triggered automatically by a diagnostic result:

- Opportunity creation
- Author email send
- Package recommendation to author
- Contract commitment or movement
- Pipeline stage advancement

Jackie or an assigned editorial operator reviews the diagnostic result and sets `jm1_humanreviewstatus` before any next-stage movement. `jm1_diagnosticrequireshumanreview` is always set to `true` on any Stage 0 result.

## 12. Summary-Field No-Quotation Rule

`jm1_diagnosticoutputsummary` must be characterization only, never quotation.

It must not contain:

- Manuscript excerpts
- Quoted manuscript passages
- Author-submitted raw prose
- Any verbatim sentence or phrase from the manuscript

The same no-quotation rule applies to all output and log fields:

| Field / log | No-quotation rule applies |
|---|---|
| `jm1_diagnosticoutputsummary` | Yes |
| `jm1_diagnosticstructuredoutputjson` | Yes |
| `jm1_diagnosticriskflags` | Yes |
| `jm1_airequestlog` (all text fields) | Yes |
| `jm1_executionlog` (all text fields) | Yes |
| `jm1_diagnosticexecutionerror` | Yes |
| `jm1_humanreviewnotes` | Yes |

The diagnostic output must describe and characterize the manuscript — it must never reproduce it. Risk flags must name the category of concern — they must never quote the manuscript passage that triggered the flag.

This rule is not optional and is not relaxed by confidence score or diagnostic status.

## 13. Legacy-Exclusion Seal

Legacy-flagged intakes cannot enter the INT-PUB-005 Stage 0 Diagnostic Runner path.

If a Legacy intake or Legacy route flag is detected on the Publishing Intake record or the Editorial Diagnostic record, the Diagnostic AI Runner must:

- Return a safe error without calling any AI endpoint
- Set `jm1_diagnosticexecutionstatus` to `835500005` (Deferred) or `835500003` (Exception) with a safe internal note
- Not read, extract, or process the manuscript file in any way

No Legacy manuscript may be processed by this diagnostic runner unless a separate governed Legacy diagnostic path is approved by Jackie and documented in a separate activation contract.

The Legacy-exclusion check must occur before manuscript resolution. It is a pre-flight gate, not a post-AI cleanup step.

## 14. Non-Authorization Statement

This decision record resolves activation design decisions but does not authorize real AI execution.

The Diagnostic AI Runner remains in contract-test mode (`CONTRACT_TEST_MODE=true`) until Jackie explicitly approves activation and all items in Section 15 are satisfied and documented.

No AI call, no manuscript read, no Foundry call, no Azure OpenAI call, and no change to `CONTRACT_TEST_MODE` may proceed based on this document alone.

## 15. Open Implementation Steps Before Real AI Activation

The following must be completed, verified, and documented before the runner may process a real manuscript:

| Step | Status |
|---|---|
| `CONTRACT_TEST_MODE` changed from `true` to `false` on `func-jm1-diagnostic-ai-runner` app settings | Not started |
| Azure OpenAI / Foundry deployment alias `jm1-pub-diagnostic-primary` confirmed active and accessible from the Function App's managed identity | Not verified |
| `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_API_VERSION` (or Foundry equivalents) added to Function App app settings via Key Vault references | Not started |
| Prompt template `jm1-prompt-pub-stage0-diagnostic` created in `jm1pub_aiprompttemplates` Dataverse table with version `PUB-STAGE0-DIAGNOSTIC-V1` | Done — record ID `ef8acd4f-6869-f111-a826-000d3a14673b`, prompt body drafted 2026-06-16, inactive pending Jackie approval |
| `jm1pub_groundingdependencies` field on prompt template populated with `knowledge.md` and other declared grounding dependencies | Done — field created on `jm1pub_aiprompttemplate`, value `knowledge.md` set on governance shell record, 2026-06-16 |
| `knowledge.md` grounding file confirmed in governed location accessible to the AI runtime | **Done** — v1.0 uploaded 2026-06-16T22:50:25Z. SHA-256: `64e0e38f8a2cfdacf49fd8238b45939efbafef3bd23d526ab3d0d414b24e8a78`. ETag: `"0x8DECBF9A7DEF3A2"`. Approved via PR #60 (commit `10b8429`). Managed identity `Storage Blob Data Reader` in place. Runner read verified 2026-06-16: `reachable=true`, `hashMatched=true` via HTTP contract test. |
| DOCX and TXT extraction logic implemented in the Azure Function (transient, no persistence) | Not started |
| Legacy-exclusion gate implemented in the Azure Function pre-flight check | Not started |
| No-quotation output validation implemented in the Azure Function (output fields contain no manuscript excerpts) | Not started |
| Confidence threshold routing implemented (`jm1_diagnosticconfidence` written; status mapped per Section 8) | Not started |
| `jm1_airequestlog` write implemented in the Azure Function | Not started |
| `jm1_executionlog` write implemented in the Azure Function | Not started |
| AI Request Log and Execution Log confirmed to contain no raw manuscript text or secrets | Not started |
| `jm1_diagnosticstructuredoutputjson` and `jm1_diagnosticriskflags` write implemented with no-quotation validation | Not started |
| Human review status (`jm1_humanreviewstatus`) set to `Pending Review` on every completed or needs-review result | Not started |
| Controlled activation test with a safe synthetic manuscript (DOCX, no real author content) run and verified | Not started |
| Jackie explicitly approves activation and signs off on this checklist | Not started |
