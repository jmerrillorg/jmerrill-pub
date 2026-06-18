# INT-PUB-005 Stage 0 Diagnostic AI — Activation Decision Record

## 1. Purpose

This document records the resolved activation design decisions for the INT-PUB-005 Stage 0 Diagnostic AI execution path. It folds in four governance reconciliation items from the pipeline review and defines the canonical identifiers, prompt governance, grounding dependencies, manuscript boundary, confidence thresholds, output storage, logging contract, human review model, no-quotation discipline, and Legacy exclusion that must be satisfied before real AI execution is authorized.

**Approval 1 granted 2026-06-17:** Jackie approved INT-PUB-005 to proceed from contract-test mode to controlled synthetic real-AI activation testing only. This authorizes one controlled synthetic AI call using only synthetic fixture content. Real manuscript processing, author-facing output, Opportunity creation, author email, and production diagnostic execution remain prohibited. See Section 14 and Section 16.

## 2. Current Verified State

| Component | Status |
|---|---|
| INT-PUB-005 /join intake | Complete and live |
| Flow A — Contact and Lead creation | Live |
| Flow B — ACS acknowledgment email | Live |
| Flow C — Stage 0 Editorial Diagnostic handoff | Live |
| Flow D — manuscript asset gate | Live |
| Diagnostic AI Runner Azure Function (`func-jm1-diagnostic-ai-runner`) | Deployed. `CONTRACT_TEST_MODE=false`, `JM1_AI_EXECUTION_ENABLED=true`. Synthetic AI tests authorized under Approval 1. |
| Flow D → Runner integration | Live. Real manuscript processing via Flow D not authorized until Approval 2. |
| Real AI execution | **Approval 2 granted 2026-06-17** — one limited real-manuscript diagnostic pilot authorized. See Section 18. General production execution, author-facing output, Opportunity creation, and author email remain prohibited. |

## 3. Approved Activation Decisions

| Decision | Resolved value |
|---|---|
| AI service endpoint / provider | Provider abstraction via `JM1_AI_PROVIDER`: `anthropic` (Claude Sonnet — preferred for REV) or `azure-openai` (infrastructure-validated fallback). Selectable at runtime without code change. |
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

**File status:** v1.1 live as of 2026-06-17T11:31:04Z. SHA-256: `771c0b6d198ba47abf0c2cc411a49a0c16a7fee4b0960403e08d41da433fb957`. All sections complete including v1.1 additions: Section 2a (Scoring Dimension Weights by Imprint) and Section 2b (Confidence Score Calibration). Runner `hashMatched=true` verified 2026-06-17. See knowledge grounding doc for full version history.

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
| DOCX and TXT extraction logic implemented in the Azure Function (transient, no persistence) | **Done** — `src/extraction/manuscriptExtractor.js` implemented 2026-06-17. Returns safe metadata only (`charCount`, `wordCount`, `lineCount`, `sha256`, `byteLength`, `contentReturned: false`). Extracted text is transient runtime memory — never returned, logged, or stored. Verified via 21-test suite (4 suites: TXT, DOCX, unsupported types, safety invariants). Synthetic TXT and DOCX fixtures committed. Azure HTTP test verified (see runner verification table). |
| Legacy-exclusion gate implemented in the Azure Function pre-flight check | **Done** — `src/preflight/legacyExclusionCheck.js` implemented 2026-06-17. Gate fires before knowledge verification, before extraction, before any manuscript access or AI call. In contract-test mode, `legacyFlag: true` in request body simulates a Legacy-flagged intake (production path will read from Dataverse). Returns HTTP 422 `LEGACY_EXCLUDED` with safe message. Verified live: `legacyFlag:true` → 422; `legacyFlag:true` + `verifyExtraction:true` → 422 (gate fires first); `legacyFlag` absent → 202; `legacyFlag:false` → 202. 16 unit tests in `test/legacyExclusion.test.js` (7 gate tests, 7 flag-parsing tests, 2 ordering-contract tests). |
| No-quotation output validation implemented in the Azure Function (output fields contain no manuscript excerpts) | **Done** — `src/validation/noQuotationValidator.js` implemented 2026-06-17. Validates all five output fields (`jm1_diagnosticoutputsummary`, `jm1_diagnosticstructuredoutputjson`, `jm1_diagnosticriskflags`, `jm1_diagnosticexecutionerror`, `jm1_humanreviewnotes`) against four rules: `QUOTED_CONTENT` (quoted spans ≥ 4 words), `PROMPT_LEAKAGE` (prompt instruction phrases), `PROSE_BLOCK` (unbroken spans > 300 chars in non-JSON fields), `JSON_PROSE_VALUE` (string values > 300 chars in JSON field). Unknown fields trigger `UNKNOWN_FIELD` violation. Violation objects contain no offending text. 34 unit tests in `test/noQuotationValidation.test.js` (7 suites). HTTP contract test verified 2026-06-17: clean output → 202 valid; quoted content → 422 `OUTPUT_QUOTATION_VIOLATION`; prompt leakage → 422; Legacy gate fires before output validation. |
| Confidence threshold routing implemented (`jm1_diagnosticconfidence` written; status mapped per Section 8) | **Done** — `src/routing/confidenceRouter.js` implemented 2026-06-17. Pure routing logic, no side effects, no Dataverse writes. Routes to Completed (835500002), Needs Human Review (835500004), Exception (835500003), or Deferred (835500005) per ADR Section 8 thresholds. `requiresHumanReview` is always `true`. Low-confidence note set when confidence < 0.70. Priority order: manuscriptGateFailure → technicalFailure → confidence thresholds. 34 unit tests in `test/confidenceRouting.test.js` (8 suites including threshold boundaries, priority ordering, and requiresHumanReview invariant). All 5 routing paths verified live 2026-06-17: Completed (0.90), Needs Human Review mid (0.75), Needs Human Review low (0.50) with note, Exception (technicalFailure), Deferred (manuscriptGateFailure). STATUS values match ADR Section 8 Dataverse choice values. No Dataverse write in this pass. |
| `jm1_airequestlog` write implemented in the Azure Function | **Done** — `src/dataverse/metadataWriter.js` implemented 2026-06-17. Entity set: `jm1_airequestlogs`. Writes safe metadata only: agent name/version, request ID, model deployment alias, prompt key/version, request status, timestamps, source entity/record ID, source brand, human review required flag, confidence, token counts, correlation ID. PROHIBITED fields never set: `jm1_requestpayload` (prompt body), `jm1_responsepayload` (model output), `jm1_airecommendation` (model output). Runner MSI (`func-jm1-diagnostic-ai-runner`, appId `dc8d1429-8c1b-473b-83ca-f9545fad8074`) registered as Dataverse application user with `JM1 Publishing Intake API - Create Only` role + `prvCreatejm1_AIRequestLog`, `prvWritejm1_AIRequestLog`, `prvReadjm1_AIRequestLog` privileges. Live contract test 2026-06-17: record `3435a7f9-206a-f111-a826-00224820105b` created — `jm1_requestpayload=null`, `jm1_responsepayload=null`, `jm1_airecommendation=null` confirmed. |
| `jm1_executionlog` write implemented in the Azure Function | **Done** — `src/dataverse/metadataWriter.js`. Entity set: `jm1_executionlogs`. Writes safe metadata only: agent name/model, action type/description, band level, execution status, start/complete timestamps, source entity/record ID. Action description explicitly states "No manuscript text stored. No prompt body stored." Runner MSI granted `prvCreatejm1_ExecutionLog`, `prvWritejm1_ExecutionLog`, `prvReadjm1_ExecutionLog` privileges. Live contract test 2026-06-17: record `62ec86f8-206a-f111-a826-6045bdd69678` created — `jm1_executionstatus=835500001` (Success), `jm1_bandlevel=835500000` (Band 1), action description confirmed clean. |
| AI Request Log and Execution Log confirmed to contain no raw manuscript text or secrets | **Done** — Dataverse record inspection 2026-06-17 confirms: `jm1_requestpayload=null`, `jm1_responsepayload=null`, `jm1_airecommendation=null` on AI Request Log. Execution Log action description contains only safe identifiers and mode name. No manuscript content, extracted text, prompt body, model output, secrets, headers, or tokens stored in any field. 36 unit tests in `test/metadataWrite.test.js` (6 suites) verify prohibited fields absent from payload builders. |
| Controlled synthetic end-to-end runner test (knowledge → extraction → legacy gate → output validation → confidence routing → metadata writes) | **Done** — `src/functions/runStage0Diagnostic.js` `verifyFullPipeline: true` route implemented 2026-06-17. Chains all 5 scaffold stages sequentially in a single request. 23 unit tests in `test/syntheticE2E.test.js` (6 suites). Live E2E tests 2026-06-17: DOCX fixture → all 5 stages pass → Completed (0.90, 835500002) + both log records created; TXT fixture → all 5 stages pass → Needs Human Review CONFIDENCE_LOW (0.50) + lowConfidenceNote + both log records created; legacyFlag:true → 422 LEGACY_EXCLUDED before any pipeline stage. knowledge.md hash matched (`64e0e38f…`). All extractions `contentReturned=false`. No AI called. No real manuscript processed. No Flow D modified. |
| `jm1_diagnosticstructuredoutputjson` and `jm1_diagnosticriskflags` write implemented with no-quotation validation | Not started |
| Human review status (`jm1_humanreviewstatus`) set to `Pending Review` on every completed or needs-review result | Not started |
| AI execution dual-gate scaffold (`JM1_AI_EXECUTION_ENABLED` env var + `CONTRACT_TEST_MODE` hardcoded constant) implemented, with `controlled-ai-test` mode and model caller stub | **Done** — `src/activation/aiExecutionGate.js` and `src/ai/modelCaller.js` implemented 2026-06-17. Dual gate: `CONTRACT_TEST_MODE=true` (hardcoded, requires code change + Jackie Approval 1) AND `JM1_AI_EXECUTION_ENABLED=true` (env var, requires explicit setting) must both be open before any model call executes. Neither gate alone is sufficient. `controlledAiTest: true` route added to handler — with both gates closed (current state), returns `gate-closed` 200 with full gate state. When gates open, executes synthetic-fixture-only path: knowledge verify → extraction → model call → no-quotation validation → confidence routing → metadata write. 23 unit tests in `test/aiActivationGate.test.js` (6 suites) prove AI cannot run unless both gates are intentionally opened. Live gate-closed test 2026-06-17: `status=gate-closed`, `reason=CONTRACT_TEST_MODE_ACTIVE`, `aiExecutionEnabled=false`. verifyFullPipeline and legacy gate unaffected (regression verified live 2026-06-17). |
| Azure OpenAI resource `oai-jm1-diagnostic` provisioned in `rg-jm1-ai` East US; `gpt-4o-mini` (2024-07-18) deployed as `jm1-pub-diagnostic-primary` (GlobalStandard, 10K TPM); Function MSI granted `Cognitive Services OpenAI User`; endpoint `https://oai-jm1-diagnostic.openai.azure.com/` | **Done** — provisioned 2026-06-17. MSI principal `e8c51a80-bdb0-46fa-b398-9109719d6427` assigned role `/resourceGroups/rg-jm1-ai/providers/Microsoft.CognitiveServices/accounts/oai-jm1-diagnostic`. App settings `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_VERSION` (`2024-08-01-preview`), `AZURE_OPENAI_DEPLOYMENT_NAME` set on `func-jm1-diagnostic-ai-runner`. |
| `CONTRACT_TEST_MODE` changed from `true` to `false` | **Done** — changed 2026-06-17 under Jackie Approval 1 (granted 2026-06-17). Controlled synthetic real-AI test only. |
| `JM1_AI_EXECUTION_ENABLED=true` set on Function App | **Done** — set 2026-06-17 as part of controlled activation. Second gate now open. |
| Controlled activation test with a safe synthetic manuscript (DOCX, no real author content) run and verified | **Done** — see Section 16. |
| Jackie explicitly approves activation and signs off on this checklist | **Approval 1 granted 2026-06-17** — controlled synthetic real-AI test only. Production activation requires separate Approval 2. |
| Provider abstraction layer (`JM1_AI_PROVIDER`) with `anthropic` and `azure-openai` providers; `modelCaller.js` refactored to gate-enforced router; `anthropicProvider.js` (Anthropic Messages API, Claude Sonnet) and `azureOpenAiProvider.js` (MSI) implemented; `src/ai/modelCaller.js` made a backward-compatible shim; 44 new unit tests (260 total, 0 failures); dual gate still enforced on all provider paths | **Done** — PR #71, 2026-06-17. `JM1_AI_PROVIDER` selects provider at runtime. Supported values: `anthropic` (Claude Sonnet — preferred for REV), `azure-openai` (infrastructure-validated fallback). Neither provider is called when either gate is closed. No secrets logged or returned. |

## 16. Controlled Synthetic Real-AI Test Record (Approval 1)

**Authorization:** Jackie Approval 1, granted 2026-06-17.

**Scope:** One controlled synthetic AI call using synthetic fixture only. No real manuscripts. No production use. All outputs subject to Jackie review before any further activation decision.

### Test parameters

| Item | Value |
|---|---|
| Test date | 2026-06-17 |
| Fixture | TXT synthetic fixture (`synthetic-stage0.txt`, 153 words, 1094 bytes) |
| Model | `gpt-4o-mini` (2024-07-18) |
| Deployment | `jm1-pub-diagnostic-primary` |
| Endpoint | `https://oai-jm1-diagnostic.openai.azure.com/` |
| API version | `2024-08-01-preview` |
| Execution mode | `controlled-ai-test` |
| Real manuscript | None |
| Author content | None |
| HTTP result | 202 accepted |
| Gate state | `permitted=true`, reason `OPEN` |
| Tokens | 98 input / 76 output / 174 total |

### Pipeline stage results

| Stage | Result |
|---|---|
| Legacy gate | `excluded=false` |
| knowledge.md | `reachable=true`, `hashMatched=true`, 29,232 bytes |
| Extraction | `supported=true`, `.txt`, 153 words, `contentReturned=false` |
| Model call | HTTP 200, ok |
| Output validation | Passed — 0 violations, no quoted text, no prompt leakage |
| Confidence routing | `CONFIDENCE_LOW` (0.0) → `Needs Human Review` (835500004), low-confidence note set |
| AI Request Log | Created — `1040adcd-386a-f111-a826-00224820105b` |
| Execution Log | Created — `0dc395cc-386a-f111-a826-000d3a14673b` |

### Model output (full, for Jackie review)

```json
{
  "jm1_diagnosticoutputsummary": "The manuscript is a controlled synthetic fixture and does not represent a real submission. It contains 153 words and is intended for contract testing purposes only.",
  "jm1_diagnosticriskflags": [],
  "jm1_confidence": 0,
  "jm1_requireshumanreview": true
}
```

### Post-test review checklist (Jackie)

| Check | Result |
|---|---|
| Output is characterization only — no quoted manuscript text | **Pass** — output describes the fixture, contains no prose excerpts |
| No prompt leakage in output | **Pass** — no prompt instruction text in output |
| No-quotation validation passed | **Pass** — validator confirmed 0 violations |
| Confidence score present and numeric | **Pass** — `jm1_confidence: 0` (numeric zero, not absent) |
| `requiresHumanReview=true` on result | **Pass** |
| AI Request Log created, prohibited fields null | **Pass** — record `1040adcd…` created; `jm1_requestpayload`, `jm1_responsepayload`, `jm1_airecommendation` not set |
| Execution Log created | **Pass** — record `0dc395cc…` created |
| No manuscript text in any log field | **Pass** — action description contains only safe identifiers and mode name |
| Output is editorially useful (Stage 0 direction) | **N/A for this test** — synthetic fixture correctly identified as non-real; no editorial direction expected or appropriate |
| Output safety: conservative enough for internal use | **Pass** — model appropriately declined to evaluate a non-real fixture |

### Jackie's interpretation (2026-06-17)

The model returning `jm1_confidence: 0` is the correct behavior for this test. The model recognized it was not evaluating a real manuscript and signalled low confidence rather than fabricating editorial direction. This proves:

- The gate and routing posture work correctly
- Synthetic / insufficient editorial substance → low confidence → Needs Human Review → no author-facing action
- The infrastructure (MSI auth, knowledge.md grounding, no-quotation validation, Dataverse writes) is validated end-to-end

### Approval 2 decision

**Deferred. Approval 2 is not yet recommended.**

**Reason:** This test validates infrastructure and safety gates. It does not validate editorial diagnostic quality. The model used (`gpt-4o-mini`) is not the preferred model for real manuscript REV / Intake Editorial Review work.

Per the approved model strategy:

| Use case | Preferred model |
|---|---|
| REV / Intake Editorial Review | Claude Sonnet |
| Developmental diagnostic | Claude Sonnet |
| Line / Copy | GPT-5.x (to be tested) |

`gpt-4o-mini` was the correct choice for infrastructure validation. It is not the right model for real manuscript Stage 0 Editorial Diagnostics.

**Decision:** Approval 1 test passed. Infrastructure validated. Safety gates validated. Production real-manuscript execution remains blocked.

**What must happen before Approval 2:**

1. Add provider abstraction to `modelCaller.js` to support Claude Sonnet (via Azure AI Foundry or Anthropic API)
2. Deploy a Claude Sonnet endpoint under `jm1-pub-diagnostic-primary` or a new alias
3. Run a second controlled synthetic real-AI test using the preferred model
4. Review that output for editorial quality, confidence calibration, and safety
5. Only then consider Approval 2 — limited production diagnostic execution on a real approved manuscript asset

**In plain terms:** the pipes work. We still need to decide which water we want running through them.

---

## 16b. Controlled Synthetic Sonnet Real-AI Test Record (PR #72)

**Authorization:** Jackie Approval 1 (granted 2026-06-17) — synthetic fixture only. Same authorization scope as Section 16. Approval 2 not granted.

**Scope:** One controlled synthetic AI call using `JM1_AI_PROVIDER=anthropic`, `ANTHROPIC_MODEL=claude-sonnet-4-6`, synthetic TXT fixture only. No real manuscripts. No production use. All output subject to Jackie review. This test proves the Anthropic provider path works end-to-end and produces safe output on the preferred model.

### Configuration confirmed (PR #72 — 2026-06-17)

| Setting | Value |
|---|---|
| `JM1_AI_PROVIDER` | `anthropic` |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-6` |
| `ANTHROPIC_API_KEY` | Key Vault reference — `@Microsoft.KeyVault(VaultName=jm1-core-vault;SecretName=AnthropicApiKey)` |
| Key Vault RBAC | Enabled |
| Function App MSI | `e8c51a80-bdb0-46fa-b398-9109719d6427` — `Key Vault Secrets User` on `jm1-core-vault` |

### Test parameters

| Item | Value |
|---|---|
| Test date | 2026-06-17 |
| Fixture | TXT synthetic fixture (`synthetic-stage0.txt`, 153 words, 1094 bytes) |
| Provider | `anthropic` |
| Model | `claude-sonnet-4-6` |
| Endpoint | `https://api.anthropic.com/v1/messages` |
| Anthropic API version | `2023-06-01` |
| Execution mode | `controlled-ai-test` |
| Diagnostic ID | `a2b3c4d5-e6f7-4890-abcd-ef1234567890` |
| Intake reference | `JMP-INT-260617-SONNET-SYNTHETIC-TEST` |
| Correlation ID | `pr72-sonnet-synthetic-20260617` |
| Real manuscript | None |
| Author content | None |
| HTTP result | 202 accepted |
| Gate state | `permitted=true`, reason `OPEN` |
| Tokens | 98 input / 95 output / 193 total |

### Pipeline stage results

| Stage | Result |
|---|---|
| Legacy gate | `excluded=false` |
| knowledge.md | `reachable=true`, `hashMatched=true`, 29,232 bytes |
| Extraction | `supported=true`, `.txt`, 153 words, `contentReturned=false` |
| Model call | HTTP 200, `ok=true`, provider `anthropic` |
| Output validation | `valid=true`, 0 violations, `fieldsChecked: ["jm1_diagnosticoutputsummary"]` |
| Confidence routing | `CONFIDENCE_LOW` (0.0) → `Needs Human Review` (835500004), low-confidence note set |
| AI Request Log | Created — `94c0ffe5-3e6a-f111-a826-7c1e525b15c2` |
| Execution Log | Created — `5b5507e3-3e6a-f111-a826-000d3a14673b` |

### Model output (full, for Jackie review)

```json
{
  "jm1_diagnosticoutputsummary": "The manuscript is a controlled synthetic fixture and is not intended for real submission. It contains 153 words and serves as a contract-test only.",
  "jm1_diagnosticriskflags": ["Synthetic content", "Not a real manuscript", "Limited word count"],
  "jm1_confidence": 0,
  "jm1_requireshumanreview": true
}
```

### Independent output safety validation (CeCe — 2026-06-17)

No-quotation validator run against all text output fields after test call:

| Field | Validation result |
|---|---|
| `jm1_diagnosticoutputsummary` | `valid=true`, 0 violations — no quoted prose, no prompt leakage |
| `jm1_diagnosticriskflags[0]` (`"Synthetic content"`) | `valid=true` |
| `jm1_diagnosticriskflags[1]` (`"Not a real manuscript"`) | `valid=true` |
| `jm1_diagnosticriskflags[2]` (`"Limited word count"`) | `valid=true` |

All fields characterization only. No manuscript text. No prompt leakage.

### Post-test review checklist (Jackie)

| Check | Result |
|---|---|
| Provider confirmed as Anthropic / Claude Sonnet | **Pass** — `provider: "anthropic"` in pipeline response |
| Output is characterization only — no quoted manuscript text | **Pass** — output describes the synthetic fixture, contains no prose excerpts |
| No prompt leakage in output | **Pass** — no prompt instruction phrases in any output field |
| No-quotation validation passed | **Pass** — validator confirmed 0 violations |
| Risk flags are category labels, not prose quotations | **Pass** — `["Synthetic content", "Not a real manuscript", "Limited word count"]` |
| Confidence score present and numeric | **Pass** — `jm1_confidence: 0` (numeric zero) |
| `requiresHumanReview=true` on result | **Pass** |
| AI Request Log created | **Pass** — `94c0ffe5-3e6a-f111-a826-7c1e525b15c2` |
| Execution Log created | **Pass** — `5b5507e3-3e6a-f111-a826-000d3a14673b` |
| No manuscript text in any log field | **Pass** — metadata only |
| ANTHROPIC_API_KEY not in response | **Pass** — key material never returned or logged |
| Sonnet output quality vs gpt-4o-mini | **Pass — Sonnet preferred for REV** — risk-flag behavior is more editorially honest and cautious than gpt-4o-mini. Jackie reviewed 2026-06-17. |
| Approval 2 decision | **Deferred — knowledge.md doctrine must be completed first** |

### Comparison: gpt-4o-mini (PR #70) vs claude-sonnet-4-6 (PR #72)

| Attribute | gpt-4o-mini | claude-sonnet-4-6 |
|---|---|---|
| Summary | "…does not represent a real submission. It contains 153 words and is intended for contract testing purposes only." | "…is not intended for real submission. It contains 153 words and serves as a contract-test only." |
| Risk flags | `[]` (empty array) | `["Synthetic content", "Not a real manuscript", "Limited word count"]` |
| Confidence | `0` | `0` |
| Tokens | 98 input / 76 output / 174 total | 98 input / 95 output / 193 total |
| No-quotation pass | Yes | Yes |
| Prompt leakage | None | None |

**Notable difference:** Claude Sonnet returned structured risk flags on synthetic content where gpt-4o-mini returned an empty array. Both correctly returned `jm1_confidence: 0` — appropriate behavior for a synthetic fixture that carries no real editorial substance. Neither fabricated editorial direction.

### Jackie's interpretation (2026-06-17)

Sonnet's risk-flag behavior is preferable to gpt-4o-mini's for REV / intake editorial review. The key distinction: gpt-4o-mini treated the synthetic fixture as not requiring risk flags; Sonnet explicitly flagged the synthetic nature and limited substance. For real manuscript diagnostics, this posture is more editorially honest — it preserves concern in the structured output rather than suppressing it.

**Q1 — Should risk flags remain for synthetic/test content?**
Yes. If a submission does not meet the bar for real editorial evaluation, that should be flagged. Sonnet's behavior is correct.

**Q2 — Is `jm1_confidence: 0` appropriate for synthetic content?**
Yes. A synthetic short fixture should not receive real editorial confidence. Low confidence → Needs Human Review → no author-facing action is the correct posture.

**Q3 — Is the Sonnet summary phrasing conservative enough for internal use?**
Yes. The phrasing is appropriately minimal and non-committal for non-real content.

**Q4 — Does the prompt need refinement before real manuscript use?**
The prompt behavior on synthetic content is acceptable. The prompt cannot be properly calibrated until `knowledge.md` editorial doctrine is complete (scoring weights, imprint definitions, genre taxonomy, risk guidance). `knowledge.md` completion is the prerequisite, not further prompt surgery at this stage.

**Overall:** Sonnet is confirmed as the preferred model for INT-PUB-005 REV. The provider path is ready. The blocking dependency before Approval 2 is `knowledge.md` editorial doctrine — not code, not provider configuration.

### Approval 2 decision

**Deferred. `knowledge.md` doctrine must be completed and approved before Approval 2 can be considered.**

The Anthropic provider path is verified end-to-end. The preferred model (`claude-sonnet-4-6`) is confirmed suitable for REV. The remaining blockers before Approval 2 are:

1. `knowledge.md` editorial content completed by Jackie: scoring weights, imprint fit definitions, genre taxonomy, human review triggers, risk flag rules, readiness levels, confidence calibration guidance, package-fit language, no-author-facing-output rule
2. Jackie review and approval of completed `knowledge.md`
3. Explicit Approval 2 statement from Jackie

**What this test proves:**

- Anthropic provider path: confirmed working
- Key Vault reference for `ANTHROPIC_API_KEY`: resolves correctly at runtime
- `JM1_AI_PROVIDER=anthropic` routing: confirmed
- Claude Sonnet model call: successful
- No-quotation safety on Sonnet output: confirmed
- Metadata write with `anthropic` provider: confirmed
- Dual gate enforcement unchanged: confirmed
- Real manuscript path: still blocked

**What this test does not prove:**

- Editorial diagnostic quality on real manuscripts — synthetic fixture only
- Prompt calibration adequacy — knowledge.md content not yet complete
- Confidence score calibration — `jm1_confidence: 0` on non-real content is expected and correct, but real manuscript confidence behavior is unknown until tested under Approval 2

## 17. Pre-Approval 2 Requirements

The following must be completed before Approval 2 (limited production diagnostic execution) can be considered:

| Requirement | Status |
|---|---|
| Provider abstraction in `modelCaller.js` to support Claude Sonnet (Azure AI Foundry or Anthropic API) | **Done** — PR #71, 2026-06-17. `JM1_AI_PROVIDER` env var selects `anthropic` or `azure-openai`. `anthropicProvider.js` calls Anthropic Messages API with `x-api-key` (never logged). `ANTHROPIC_MODEL=claude-sonnet-4-6` default. Gate enforcement unchanged. |
| Claude Sonnet endpoint configured and accessible | **Done** — PR #72, 2026-06-17. `ANTHROPIC_API_KEY` set as Key Vault reference on `func-jm1-diagnostic-ai-runner`. `ANTHROPIC_MODEL=claude-sonnet-4-6`. `JM1_AI_PROVIDER=anthropic`. Key Vault RBAC enabled; MSI `Key Vault Secrets User` in place. Key resolves at runtime — never returned or logged. |
| Second controlled synthetic real-AI test using Claude Sonnet | **Done** — PR #72, 2026-06-17. See Section 16b. HTTP 202, `ok=true`, 98 input / 95 output / 193 total tokens. No-quotation validation passed. Metadata logs created. No real manuscript processed. |
| Jackie review of Claude Sonnet output for editorial quality, confidence calibration, and safety | **Done** — 2026-06-17. Sonnet confirmed preferred for REV. Risk-flag behavior (cautious, explicit) preferred over gpt-4o-mini (empty array). `jm1_confidence: 0` on synthetic content confirmed correct. See Section 16b Jackie interpretation. |
| Decision on whether `jm1-pub-diagnostic-primary` alias is reassigned or a new alias is created for Sonnet | **Resolved by provider abstraction** — `JM1_AI_PROVIDER` selects provider at runtime. `jm1-pub-diagnostic-primary` remains the Azure OpenAI deployment. Anthropic uses `ANTHROPIC_MODEL` directly. No alias reassignment needed. |
| `knowledge.md` editorial content completed by Jackie (imprint definitions, scoring weights, genre taxonomy, editorial paths, risk guidance, confidence calibration) | **Done** — PR #73, 2026-06-17. v1.1 live: 35,754 bytes, SHA-256 `771c0b6d…`, ETag `"0x8DECC63EAC29DE7"`. Added Section 2a (dimension weights per imprint) and Section 2b (confidence calibration: baseline, upward/downward adjustments, hard caps, confidence-to-routing table). Runner `hashMatched=true` verified. `KNOWLEDGE_BLOB_SHA256` app setting updated. |
| Approval 2 statement from Jackie | **Granted 2026-06-17** — one limited real-manuscript diagnostic pilot. See Section 18. |

**Current runner state:** Approval 2 granted 2026-06-17. One limited real-manuscript diagnostic pilot authorized. Provider: `anthropic` / `claude-sonnet-4-6`. `knowledge.md` v1.1. Pilot manuscript must be explicitly selected by Jackie, must have passed the manuscript asset gate, and must use the full governed pipeline. Jackie review required before any decision to expand.

## 18. Approval 2 — Limited Real-Manuscript Diagnostic Pilot

### Approval statement

**Granted by:** Jackie Merrill
**Date:** 2026-06-17
**Scope:** One limited real-manuscript diagnostic pilot

> "I approve INT-PUB-005 for one limited real-manuscript diagnostic pilot. This approval authorizes the Diagnostic AI Runner to process one approved manuscript asset that has passed the manuscript asset gate and is explicitly selected for this pilot. This approval does not authorize general production diagnostic execution, author-facing AI output, Opportunity creation, author emails, automatic package recommendations, or unattended pipeline advancement. The pilot diagnostic must use the approved provider/model configuration, the governed knowledge.md v1.1 grounding file, no-quotation validation, confidence routing, metadata-safe logging, and human review before any further action. The result must be reviewed by Jackie before any decision is made to expand beyond this single pilot."

### What Approval 2 authorizes

| Authorized | Condition |
|---|---|
| One real-manuscript diagnostic pilot call | Manuscript must be explicitly selected by Jackie; must have passed the manuscript asset gate |
| `claude-sonnet-4-6` via Anthropic provider | `JM1_AI_PROVIDER=anthropic`, `ANTHROPIC_MODEL=claude-sonnet-4-6` |
| `knowledge.md` v1.1 grounding | SHA-256 `771c0b6d…` — runner must confirm `hashMatched=true` before any real manuscript call |
| No-quotation validation on all output fields | Must pass before metadata write |
| Confidence routing per Section 8 thresholds | `requiresHumanReview=true` always |
| Metadata-safe logging to `jm1_airequestlog` and `jm1_executionlog` | Safe fields only; prohibited fields never written |
| Jackie review of pilot result | Required before any further action |

### What Approval 2 does not authorize

| Not authorized |
|---|
| General production diagnostic execution on multiple manuscripts |
| Author-facing AI output of any kind |
| Opportunity creation |
| Author email send |
| Automatic package recommendation to author |
| Unattended pipeline advancement |
| Expansion beyond one pilot manuscript without a separate explicit Jackie decision |
| Flow D calling the runner automatically for any record |
| Any change to the prompt template without a separate governed pass |
| Any change to `knowledge.md` without Jackie approval and a separate PR |

### Pilot execution requirements

Before the pilot call is made, the following must be confirmed:

| Requirement | Detail |
|---|---|
| Manuscript explicitly selected by Jackie | Jackie must name the specific manuscript / Editorial Diagnostic record |
| Manuscript asset gate passed | `jm1pub_editorialdiagnostic` record must confirm manuscript asset is available |
| Legacy-exclusion check passed | Record must not be Legacy-flagged |
| `diagnosticId` confirmed | UUID from the `jm1pub_editorialdiagnostic` record |
| `intakeReferenceCode` confirmed | `JMP-INT-…` code from the related Publishing Intake |
| `knowledge.md` `hashMatched=true` | Runner confirms at pipeline start |
| No-quotation validation | Must pass on all output fields before metadata write |
| All output internal | No output shared with author before Jackie review |

### Pilot result record

| Item | Value |
|---|---|
| Pilot date | 2026-06-18 |
| Manuscript / Diagnostic ID | Establishing Glory: The Library / `64e387e0-7e6a-f111-a826-00224820105b` |
| Intake reference | `JMP-INT-202606-UFYG60` |
| HTTP status | `202 Accepted` |
| Gate state | Closed before call, opened for one authorized request, closed immediately after call (`JM1_AI_EXECUTION_ENABLED=false`) |
| knowledge.md hashMatched | `true` |
| Tokens | 74,886 input / 223 output / 75,109 total |
| No-quotation validation | passed (`valid=true`, 0 violations; fields checked: `jm1_diagnosticoutputsummary`, `jm1_diagnosticriskflags`) |
| Confidence | 0.79 |
| Routing status | Needs Human Review (`835500004`, basis `CONFIDENCE_MID`) |
| AI Request Log ID | `7bc36fcb-fb6a-f111-a826-6045bdd69738` |
| Execution Log ID | `930310ce-fb6a-f111-a826-000d3a14673b` |
| Jackie review date | Pending |
| Jackie review outcome | Pending |
| Expansion decision | No expansion authorized; gate closed |

Safe result record: [`int-pub-005-real-manuscript-pilot-attempt-4.md`](./int-pub-005-real-manuscript-pilot-attempt-4.md)

The fourth attempt was authorized only after PR #81 and PR #82 were merged and PR #82 was deployed. It was limited to diagnostic `64e387e0-7e6a-f111-a826-00224820105b`, intake reference `JMP-INT-202606-UFYG60`, and manuscript `Establishing Glory: The Library`.

The call confirmed the PR #82 brevity constraints can pass schema validation and the unchanged no-quotation/output validator. The raw diagnostic output, prompt body, manuscript content, runner key, request headers, cookies, tokens, and connection strings are not stored in this record.

No author-facing output was generated. No author email was sent. No Opportunity was created. Flow D production wiring remains inactive.

## 19. PR #82 — Output Brevity Constraints After Attempt 3

### Attempt 3 result

Attempt 3 reached the real-manuscript route and passed schema validation. The runner successfully completed Dataverse read, manuscript asset gate, Graph-authenticated SharePoint download, DOCX extraction, prompt injection, Anthropic tool-use, and required-field schema validation.

The attempt failed at `outputValidation`, not schema validation. The no-quotation validator returned `PILOT_OUTPUT_QUOTATION_VIOLATION` because two text fields contained prose blocks longer than the 300-character safety limit:

| Field | Rule | Result |
|---|---|---|
| `jm1_diagnosticoutputsummary` | `PROSE_BLOCK` | 313-character prose block exceeded 300-character limit |
| `jm1_diagnosticriskflags` | `PROSE_BLOCK` | 453-character prose block exceeded 300-character limit |

### PR #82 change

PR #82 adds brevity constraints so the model is directed to produce concise, non-paragraph text fields that can pass the existing no-quotation validator.

- `jm1_diagnosticoutputsummary`: Anthropic tool schema `maxLength: 240`; prompt directs one short characterization sentence only.
- `jm1_diagnosticriskflags`: Anthropic tool schema `maxLength: 240`; prompt directs short labels only, separated by semicolons.
- Prompt explicitly prohibits paragraph-style prose, long explanatory sentences, manuscript quotations, manuscript excerpts, close paraphrase, prompt text, and implementation details.

### Governance status

- The no-quotation validator remains strict.
- The 300-character `PROSE_BLOCK` rule remains unchanged.
- Schema validation remains strict for required fields, types, confidence range, and `jm1_requireshumanreview=true`.
- Gate remains closed: `JM1_AI_EXECUTION_ENABLED=false`.
- No fourth pilot call occurred in PR #82.
- A fourth attempt requires new Jackie authorization.
- Flow D was not changed.
- No author email was sent.
- No Opportunity was created.
- No raw model response, manuscript text, or prompt body was stored.

## 20. PR #84 - Stage 0 Diagnostic Production Readiness Plan

PR #83 recorded the first successful, safe, accepted real-manuscript diagnostic pilot result. The result passed schema validation, passed no-quotation/output validation with 0 violations, routed to Needs Human Review, and left production activation unauthorized.

The next step is planning, not execution. PR #84 defines the controlled-production readiness path in:

[`int-pub-005-stage0-diagnostic-production-readiness-plan.md`](./int-pub-005-stage0-diagnostic-production-readiness-plan.md)

### Governance status

- `JM1_AI_EXECUTION_ENABLED=false`.
- No additional diagnostic run is authorized.
- Flow D production activation is not authorized.
- No author-facing output is authorized.
- No author email is authorized.
- No Opportunity creation is authorized.
- No historical or broad record processing is authorized.
- A separate explicit Jackie decision is required before controlled-production implementation or activation.

## 21. PR #85 - Controlled Diagnostic Queue Selection

PR #85 introduces a controlled queue selection layer for approved INT-PUB-005 diagnostic records. The selector is internal-only and evaluates eligibility without processing records.

### What changed

- Queue selection logic added for diagnostic records and Dataverse-style query results.
- Eligibility returns only safe fields: `eligible`, `reason`, `missingFields`, `blockingConditions`, `diagnosticId`, and `intakeReferenceCode`.
- Queue selection blocks records with missing governance fields, unapproved manuscript assets, unsupported file types, completed/processing/human-review statuses, retry-limit exhaustion, manual blocks, or missing/malformed execution status.

### Governance status

- Production activation remains unauthorized.
- `JM1_AI_EXECUTION_ENABLED=false`.
- No diagnostic run occurred.
- No author-facing output is authorized.
- No author email is authorized.
- No Opportunity creation is authorized.
- Flow D activation is not authorized.

## 29. PR #94 - Author Draft Live Persistence Enablement

PR #94 enables live Dataverse persistence for internal `DRAFT_ONLY` author-response drafts on the existing Stage 0 Editorial Diagnostic record.

### What changed

- Safe author-response drafts can be written to the confirmed author draft fields on `jm1pub_editorialdiagnostic`.
- Writes update the existing `jm1pub_editorialdiagnostics(<diagnosticId>)` row.
- Draft send status remains `DRAFT_ONLY`.
- Draft approval status remains `PENDING_HUMAN_APPROVAL`.
- Required future visibility mailbox remains `publishing@jmerrill.one`.
- Future internal-copy and Dataverse send-log requirements remain `true`.
- Approval fields remain empty until later human approval.

### Governance status

- Internal draft persistence only.
- No send.
- Production activation remains unauthorized.
- `JM1_AI_EXECUTION_ENABLED=false`.
- No diagnostic run occurred.
- No author-facing output was sent.
- No author email was sent.
- No Opportunity creation is authorized.
- Flow D activation is not authorized.

## 30. PR #95 - Author Draft Human Approval Decision Model

PR #95 introduces the internal human approval decision model for persisted author-response drafts.

### What changed

- Human reviewers may approve a draft for later send preparation, request draft revision, reject the draft, or hold the draft in review.
- `APPROVE_FOR_SEND_PREPARATION` maps only to internal status `APPROVED_FOR_SEND_PREPARATION`.
- `NEEDS_DRAFT_REVISION` maps to `NEEDS_DRAFT_REVISION`.
- `REJECT_DRAFT` maps to `DRAFT_REJECTED`.
- `HOLD_DRAFT_REVIEW` keeps `PENDING_HUMAN_APPROVAL`.
- All decisions preserve `sendStatus=DRAFT_ONLY`.
- Reviewer notes are required for revision and rejection decisions.

### Governance status

- Internal decision model only.
- No send.
- Production activation remains unauthorized.
- `JM1_AI_EXECUTION_ENABLED=false`.
- No diagnostic run occurred.
- No author-facing output was sent.
- No author email was sent.
- No Opportunity creation is authorized.
- Flow D activation is not authorized.
- Queue eligibility is not permission to process a record.
- Future author-facing system email must copy or internally mirror to `publishing@jmerrill.one` and log the send event in Dataverse.

## 22. PR #86 - Internal Diagnostic Result Review Layer

PR #86 introduces an internal-only review payload builder for validated Stage 0 diagnostic results.

### What changed

- Internal diagnostic review payload preparation added for already-validated AI diagnostic output.
- Review payload defaults to `PENDING_HUMAN_REVIEW`.
- Review payload requires safe identifiers, validated summary, risk flags, confidence, `requiresHumanReview=true`, and a safe routing decision.
- Review payload excludes manuscript text, extracted content, prompt body, raw model response, author email fields, Opportunity fields, Flow D trigger fields, secrets, tokens, headers, and keys.

### Governance status

- Production activation remains unauthorized.
- `JM1_AI_EXECUTION_ENABLED=false`.
- No diagnostic run occurred.
- No author-facing output is authorized.
- No author email is authorized.
- No Opportunity creation is authorized.
- Flow D activation is not authorized.
- Human review remains required before any author-facing communication.
- Future author-facing system email must copy or internally mirror to `publishing@jmerrill.one` and log the send event in Dataverse.

## 24. PR #89 - Human Review Decision Model

PR #89 introduces an internal-only decision model for human review of persisted Stage 0 diagnostic results.

### What changed

- Human reviewers may choose `APPROVE_FOR_AUTHOR_DRAFT`, `NEEDS_REVISION`, `REJECT_BLOCK`, or `HOLD_FOR_REVIEW`.
- Decisions are valid only from `PENDING_HUMAN_REVIEW`.
- `NEEDS_REVISION` and `REJECT_BLOCK` require reviewer notes.
- Decision updates write only internal review fields and safe structured decision metadata.
- Approval for author draft authorizes only later draft preparation work; it does not send an email, create an Opportunity, activate Flow D, or authorize production automation.

### Governance status

- Production activation remains unauthorized.
- `JM1_AI_EXECUTION_ENABLED=false`.
- No diagnostic run occurred.
- No author-facing output is authorized.
- No author email is authorized.
- No Opportunity creation is authorized.
- Flow D activation is not authorized.
- Human review decisions are internal-only at this stage.
- Future author-facing system email must copy or internally mirror to `publishing@jmerrill.one` and log the send event in Dataverse.

## 25. PR #90 - Author Response Draft Preparation

PR #90 introduces an internal-only author response draft preparation layer for diagnostics approved with `APPROVE_FOR_AUTHOR_DRAFT`.

### What changed

- The first draft template is `INITIAL_DIAGNOSTIC_REVIEW_NEXT_STEP`.
- Draft preparation requires approved human review status, safe diagnostic identifiers, safe diagnostic summary/risk/confidence fields, `requiresHumanReview=true`, safe author/project fields, and no unsafe fields.
- Prepared drafts are marked `sendStatus=DRAFT_ONLY` and `approvalStatus=PENDING_HUMAN_APPROVAL`.
- The draft includes `internalVisibilityMailbox=publishing@jmerrill.one` as the required future visibility mailbox.
- The draft body uses careful J Merrill Publishing next-step language and avoids acceptance guarantees, package/pricing recommendations, manuscript quotes, and unsupported claims.

### Governance status

- Draft-only.
- Production activation remains unauthorized.
- `JM1_AI_EXECUTION_ENABLED=false`.
- No diagnostic run occurred.
- No author-facing output was sent.
- No author email was sent.
- No Opportunity creation is authorized.
- Flow D activation is not authorized.
- Human approval remains required before any author-facing email.
- Future author-facing system email must copy or internally mirror to `publishing@jmerrill.one` and log the send event in Dataverse.

## 27. PR #92 - Author Draft Dataverse Field Map

PR #92 introduces the internal Dataverse field map for author-response draft persistence.

### What changed

- Author draft persistence target remains the existing `jm1pub_editorialdiagnostic` record.
- Entity set remains `jm1pub_editorialdiagnostics`.
- Row identity remains `jm1pub_editorialdiagnosticid`.
- Draft subject, body, template, send status, approval status, visibility mailbox, future internal-copy requirement, future Dataverse send-log requirement, preparation metadata, and approval metadata fields are mapped.
- Draft send status remains `DRAFT_ONLY`.
- Draft approval status remains `PENDING_HUMAN_APPROVAL`.
- Required future visibility mailbox remains `publishing@jmerrill.one`.
- Any unconfirmed Dataverse fields must be created or confirmed before live production writes are enabled.

### Field map

| Draft payload item | Dataverse logical field |
|---|---|
| `draftSubject` | `jm1_authordraftsubject` |
| `draftBody` | `jm1_authordraftbody` |
| `templateName` | `jm1_authordrafttemplate` |
| `sendStatus` | `jm1_authordraftsendstatus` |
| `approvalStatus` | `jm1_authordraftapprovalstatus` |
| `internalVisibilityMailbox` | `jm1_authorvisibilitymailbox` |
| `futureSendRequiresInternalCopy` | `jm1_authorfuturesendrequiresinternalcopy` |
| `futureSendRequiresDataverseLog` | `jm1_authorfuturesendrequiresdataverselog` |
| `preparedAt` | `jm1_authordraftpreparedon` |
| `preparedBy` | `jm1_authordraftpreparedby` |
| `approvedBy` | `jm1_authordraftapprovedby` |
| `approvedOn` | `jm1_authordraftapprovedon` |
| `approvalNotes` | `jm1_authordraftapprovalnotes` |

No manuscript text, extracted content, prompt body, raw model response, send-now field, sent timestamp, mail provider message ID, Opportunity field, Flow D trigger field, secret, token, header, or key is mapped.

### Governance status

- Field-map only.
- No send.
- Production activation remains unauthorized.
- `JM1_AI_EXECUTION_ENABLED=false`.
- No diagnostic run occurred.
- No author-facing output was sent.
- No author email was sent.
- No Opportunity creation is authorized.
- Flow D activation is not authorized.

## 28. PR #93 - Author Draft Dataverse Schema Confirmation

PR #93 introduces the required Dataverse schema manifest and documents live schema confirmation for internal author-response draft persistence.

### What changed

- Author draft schema target remains the existing `jm1pub_editorialdiagnostic` record.
- Entity set remains `jm1pub_editorialdiagnostics`.
- Row identity remains `jm1pub_editorialdiagnosticid`.
- Thirteen author-draft fields are confirmed created and published on `jm1pub_editorialdiagnostic`.
- The fields are added to the `JM1_Publishing` solution.
- Expected field types are documented.
- Required safe values remain `INITIAL_DIAGNOSTIC_REVIEW_NEXT_STEP`, `DRAFT_ONLY`, `PENDING_HUMAN_APPROVAL`, `publishing@jmerrill.one`, future internal copy required `true`, and future Dataverse send log required `true`.
- Live author-draft writes remain blocked until a later governed adapter activation PR.

### Governance status

- Schema confirmation only.
- No send.
- Production activation remains unauthorized.
- `JM1_AI_EXECUTION_ENABLED=false`.
- No diagnostic run occurred.
- No author-facing output was sent.
- No author email was sent.
- No Opportunity creation is authorized.
- Flow D activation is not authorized.

## 26. PR #91 - Author Draft Persistence for Human Approval

PR #91 introduces an internal author-response draft persistence adapter for safe drafts prepared by PR #90.

### What changed

- Safe draft payloads can be prepared for internal persistence through an injected Dataverse adapter.
- Persisted drafts remain `sendStatus=DRAFT_ONLY`.
- Persisted drafts remain `approvalStatus=PENDING_HUMAN_APPROVAL`.
- The required future visibility mailbox remains `publishing@jmerrill.one`.
- Future send-copy/mirror and Dataverse send-log requirements are preserved as safe draft metadata.
- Exact author-draft Dataverse fields remain a later governed schema/adapter step before any live write is wired.

### Governance status

- Draft-only.
- No send.
- Production activation remains unauthorized.
- `JM1_AI_EXECUTION_ENABLED=false`.
- No diagnostic run occurred.
- No author-facing output was sent.
- No author email was sent.
- No Opportunity creation is authorized.
- Flow D activation is not authorized.
- Human approval remains required before any author-facing email.
- Future author-facing system email must copy or internally mirror to `publishing@jmerrill.one` and log the send event in Dataverse.

## 23. PR #87 - Diagnostic Result Persistence for Internal Review

PR #87 introduces an internal diagnostic review persistence adapter for the safe review payload prepared by PR #86.

### What changed

- Internal review persistence is prepared for the existing `jm1pub_editorialdiagnostic` review record pattern, entity set `jm1pub_editorialdiagnostics`.
- The adapter accepts only safe review payload fields: diagnostic ID, intake reference, validated summary, validated risk flags, confidence, human-review requirement, routing decision, pending review/approval statuses, review timestamps, and safe provider/model/prompt/token metadata.
- The adapter fails closed if required fields are missing or malformed, if review/approval status is not `PENDING_HUMAN_REVIEW`, if unsafe fields are present, if the Dataverse client is missing, or if the Dataverse write fails.
- Manuscript text, extracted content, prompt body, raw model response, author email fields, Opportunity fields, Flow D trigger fields, secrets, tokens, headers, and keys are excluded.

### Exact Dataverse field map

| Review payload item | Dataverse logical field | Storage rule |
|---|---|---|
| `diagnosticId` | `jm1pub_editorialdiagnosticid` | Existing row ID; used to address the update, not duplicated |
| `intakeReferenceCode` | `jm1_diagnosticstructuredoutputjson` | Stored inside safe structured review packet |
| `diagnosticOutputSummary` | `jm1_diagnosticoutputsummary` | Validated concise summary |
| `diagnosticRiskFlags` | `jm1_diagnosticriskflags` | Validated concise risk labels |
| `confidence` | `jm1_diagnosticconfidence` | Decimal 0.0-1.0 |
| `requiresHumanReview` | `jm1_diagnosticrequireshumanreview` | Always `true` |
| `routingDecision.status` | `jm1_diagnosticexecutionstatus` | Existing diagnostic status choice |
| `routingDecision`, `reviewStatus`, `approvalStatus`, `preparedAt`, safe metadata | `jm1_diagnosticstructuredoutputjson` | Safe JSON packet only |
| `reviewStatus=PENDING_HUMAN_REVIEW` | `jm1_humanreviewstatus` | `835510000` Pending Review |
| `approvalStatus=PENDING_HUMAN_REVIEW` | `jm1_humanreviewstatus` | Same pending human review choice until a separate approval model is authorized |
| `reviewedBy` | `jm1_humanreviewedby` | `null` until human review occurs |
| `reviewedOn` | `jm1_humanreviewedon` | `null` until human review occurs |
| Internal review note | `jm1_humanreviewnotes` | Safe pending-review note only |
| Safe model/provider metadata | `jm1_diagnosticagentid` | Model/deployment/provider identifier, if present |
| Safe correlation/execution ID | `jm1_diagnosticcorrelationid` | Correlation or execution ID, if present |

No new Dataverse table is introduced. No author email field, Opportunity field, Flow D trigger field, manuscript field, prompt field, or raw model output field is included in this map.

### Governance status

- Production activation remains unauthorized.
- `JM1_AI_EXECUTION_ENABLED=false`.
- No diagnostic run occurred.
- No author-facing output is authorized.
- No author email is authorized.
- No Opportunity creation is authorized.
- Flow D activation is not authorized.
- Human review remains required before any author-facing communication.
- Future author-facing system email must copy or internally mirror to `publishing@jmerrill.one` and log the send event in Dataverse.
