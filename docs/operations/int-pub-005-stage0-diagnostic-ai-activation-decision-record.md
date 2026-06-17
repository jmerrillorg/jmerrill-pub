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
| Real AI execution | **Controlled synthetic AI test authorized under Approval 1** (2026-06-17). Real manuscript processing requires Approval 2. |

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

## 17. Pre-Approval 2 Requirements

The following must be completed before Approval 2 (limited production diagnostic execution) can be considered:

| Requirement | Status |
|---|---|
| Provider abstraction in `modelCaller.js` to support Claude Sonnet (Azure AI Foundry or Anthropic API) | **Done** — PR #71, 2026-06-17. `JM1_AI_PROVIDER` env var selects `anthropic` or `azure-openai`. `anthropicProvider.js` calls Anthropic Messages API with `x-api-key` (never logged). `ANTHROPIC_MODEL=claude-sonnet-4-6` default. Gate enforcement unchanged. |
| Claude Sonnet deployment or endpoint configured and MSI-accessible | Not started — requires `ANTHROPIC_API_KEY` set on Function App and Jackie Approval 2 to use Sonnet for any editorial review |
| Second controlled synthetic real-AI test using Claude Sonnet | Not started |
| Jackie review of Claude Sonnet output for editorial quality, confidence calibration, and safety | Not started |
| Decision on whether `jm1-pub-diagnostic-primary` alias is reassigned or a new alias is created for Sonnet | Not started |
| `knowledge.md` editorial content completed by Jackie (imprint definitions, scoring weights, genre taxonomy, editorial paths, risk guidance) | Not started — draft skeleton only as of 2026-06-17 |
| Approval 2 statement from Jackie | Not started |

**Current runner state:** AI gates open (`CONTRACT_TEST_MODE=false`, `JM1_AI_EXECUTION_ENABLED=true`). Synthetic AI tests may continue. Real manuscript processing remains prohibited until Approval 2.
