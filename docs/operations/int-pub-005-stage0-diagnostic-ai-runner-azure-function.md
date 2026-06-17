# INT-PUB-005 Stage 0 Diagnostic AI Runner — Azure Function

## Purpose

This document describes the architecture, contract, and operational boundary for the `jm1-diagnostic-ai-runner` Azure Function. This function is the approved execution vehicle for the future side-effect-free INT-PUB-005 Stage 0 diagnostic AI call.

**Current status:** Contract-test mode only. `CONTRACT_TEST_MODE=true`. Real AI execution is not enabled. The runner validates requests, enforces the Legacy-exclusion pre-flight gate, optionally reads and verifies the `knowledge.md` grounding file via managed identity, optionally runs DOCX/TXT extraction verification against synthetic fixtures, and optionally validates synthetic diagnostic output against the no-quotation rule. It returns HTTP 202 with a safe contract-test confirmation. It does not call any AI endpoint, read real manuscripts, or write Dataverse.

The runner will remain in contract-test mode until Jackie explicitly approves activation and all items in the activation checklist are satisfied. See:

[`docs/operations/int-pub-005-stage0-diagnostic-ai-activation-decision-record.md`](./int-pub-005-stage0-diagnostic-ai-activation-decision-record.md)

## Architecture Decision

**Decision recorded:** Jackie approved the use of a new, isolated Azure Function for diagnostic-only AI execution.

**Rationale:**

- The existing flow `JM1 PUB - Run Diagnostic AI Assessment` (ID `56d5901d-874b-f111-bec7-6045bdd69678`) creates an Opportunity, writes routing and sales fields, and composes a Jackie review email. These side effects disqualify it for INT-PUB-005 Flow D reuse.
- A new Azure Function isolates the diagnostic AI call with a strict execution boundary: no Opportunity creation, no email send, no package selection, no pipeline advancement.
- Flow D remains the gatekeeper. It calls this function only after the manuscript asset gate passes.
- Dataverse stores the result. No other system is written to.

## Function Identity

| Property | Value |
|---|---|
| Package name | `jm1-diagnostic-ai-runner` |
| Runtime | Node.js, Azure Functions v4 (`@azure/functions ^4.7.0`) |
| Route | `POST /api/run-stage0-diagnostic` |
| Auth level | `anonymous` (key enforced via `x-jm1-diagnostic-runner-key` header) |
| Path | `azure-functions/diagnostic-ai-runner/` |

## Deployment

| Property | Value |
|---|---|
| Function App name | `func-jm1-diagnostic-ai-runner` |
| Resource group | `rg-jm1-ai` |
| Location | East US |
| Runtime | Node.js 22 |
| Hosting plan | Consumption (Y1) |
| Storage account | `stjm1diagrunner` |
| Application Insights | `func-jm1-diagnostic-ai-runner` (in `rg-jm1-ai`) |
| Deployed route | `https://func-jm1-diagnostic-ai-runner.azurewebsites.net/api/run-stage0-diagnostic` |
| Deployment method | Zip deploy with remote Oryx build (`SCM_DO_BUILD_DURING_DEPLOYMENT=true`) |
| Managed identity | System-assigned; `Key Vault Secrets User` on `jm1-core-vault` |
| Deployment date | 2026-06-16 |

## Current Mode

**Contract-test mode.** `CONTRACT_TEST_MODE = true` in `src/functions/runStage0Diagnostic.js`.

In contract-test mode, the function:

- Validates the `x-jm1-diagnostic-runner-key` header
- Validates the request payload (diagnosticId, intakeReferenceCode, correlationId)
- Enforces the Legacy-exclusion pre-flight gate: if `legacyFlag: true` is present in the request body, returns HTTP 422 `LEGACY_EXCLUDED` before any manuscript access or AI call
- Optionally reads and SHA-256 verifies `knowledge.md` when `verifyKnowledge: true` is set in the request body
- Optionally runs DOCX or TXT extraction on a synthetic fixture when `verifyExtraction: true` and `syntheticFixture: "txt"|"docx"` are set — returns safe metadata only (no extracted text)
- Optionally validates synthetic diagnostic output against the no-quotation rule when `verifyOutputValidation: true` and `syntheticOutput: {...}` are set — returns 202 if valid, 422 `OUTPUT_QUOTATION_VIOLATION` if any field fails
- Optionally routes a synthetic diagnostic result through confidence-based routing when `verifyConfidenceRouting: true` and `syntheticResult: {...}` are set — returns routing decision with no Dataverse write
- Optionally writes safe synthetic metadata to `jm1_airequestlog` and `jm1_executionlog` when `verifyMetadataWrites: true` is set — returns both record IDs; no manuscript text, prompt body, model output, secrets, or headers are stored
- Optionally runs the full 5-stage synthetic pipeline when `verifyFullPipeline: true` is set: knowledge → extraction → output validation → confidence routing → metadata writes — returns all stage results in a single aggregated response
- Responds to `controlledAiTest: true` with `gate-closed` status and full gate state (both gates closed while `CONTRACT_TEST_MODE=true`); when Jackie Approval 1 is granted and both gates are opened, executes the synthetic-fixture-only real-AI path: knowledge verify → synthetic extraction → model call → no-quotation validation → confidence routing → metadata write
- Returns HTTP 202 with a safe confirmation JSON (including safe knowledge metadata, extraction metadata, validation result, routing decision, or metadata write IDs if requested)
- Does not call any AI service
- Does not read or write Dataverse
- Does not access SharePoint or the manuscript file
- Does not return or log `knowledge.md` file content — metadata only

Contract-test mode remains active until Jackie explicitly authorizes AI execution and all open decisions in the AI execution contract are resolved.

## Request Contract

### Headers

| Header | Required | Description |
|---|---|---|
| `x-jm1-diagnostic-runner-key` | Yes | Pre-shared key from `JM1_DIAGNOSTIC_RUNNER_KEY` environment variable |
| `Content-Type` | Yes | `application/json` |

### Body

```json
{
  "diagnosticId": "<UUID of the jm1pub_editorialdiagnostic record>",
  "intakeReferenceCode": "<JMP-INT-NNNNNN-... reference code>",
  "correlationId": "<optional correlation key for log matching>",
  "mode": "contract-test",
  "verifyKnowledge": true
}
```

| Field | Required | Validation |
|---|---|---|
| `diagnosticId` | Yes | UUID format (`/^[0-9a-f]{8}-[0-9a-f]{4}-…$/i`) |
| `intakeReferenceCode` | Yes | JMP-INT reference pattern (`/^JMP-INT-\d{6}-[A-Z0-9-]+$/i`) |
| `correlationId` | No | Alphanumeric, hyphens, underscores; max 100 characters |
| `mode` | No | Informational field; does not change routing — `CONTRACT_TEST_MODE` is code-controlled |
| `legacyFlag` | No | `true` (boolean) to simulate a Legacy-flagged intake. Gate fires before any downstream processing. In production this will be read from Dataverse. |
| `verifyConfidenceRouting` | No | `true` (boolean) to trigger confidence-based routing on `syntheticResult`; requires `syntheticResult` |
| `syntheticResult` | No | Object with `confidence` (number 0–1), `technicalFailure` (boolean), or `manuscriptGateFailure` (boolean); only valid when `verifyConfidenceRouting: true` |
| `verifyKnowledge` | No | `true` (boolean) to trigger `knowledge.md` Blob read and SHA-256 verification |
| `verifyExtraction` | No | `true` (boolean) to trigger synthetic-fixture extraction verification — requires `syntheticFixture` |
| `syntheticFixture` | No | `"txt"` or `"docx"` — selects the synthetic test fixture for extraction verification; only valid when `verifyExtraction: true` |
| `verifyOutputValidation` | No | `true` (boolean) to trigger no-quotation validation on `syntheticOutput`; requires `syntheticOutput` |
| `syntheticOutput` | No | Object with Dataverse output field logical names as keys and string (or null) values; only valid when `verifyOutputValidation: true` |

## Response Contract

### HTTP 202 — Contract-test accepted (standard)

```json
{
  "status": "accepted",
  "mode": "contract-test",
  "diagnosticId": "<echoed from request>",
  "intakeReferenceCode": "<echoed from request>",
  "correlationId": "<echoed or null>",
  "message": "Diagnostic runner contract accepted. AI execution not enabled."
}
```

### HTTP 202 — Contract-test accepted with knowledge verification

Returned when `verifyKnowledge: true` and the blob is reachable with a matching hash.

```json
{
  "status": "accepted",
  "mode": "contract-test",
  "diagnosticId": "<echoed from request>",
  "intakeReferenceCode": "<echoed from request>",
  "correlationId": "<echoed or null>",
  "knowledge": {
    "reachable": true,
    "hashMatched": true,
    "calculatedSha256": "<hex digest>",
    "expectedSha256": "<hex digest from KNOWLEDGE_BLOB_SHA256>",
    "byteLength": 29232,
    "etag": "<blob etag>",
    "lastModified": "<ISO 8601 timestamp>"
  },
  "message": "Diagnostic runner contract accepted. knowledge.md verified. AI execution not enabled."
}
```

`knowledge.md` file content is never included in the response. The response contains safe metadata only.

### HTTP 202 — Contract-test accepted with extraction verification

Returned when `verifyExtraction: true`, `syntheticFixture: "txt"` or `"docx"`, and extraction succeeds.

```json
{
  "status": "accepted",
  "mode": "contract-test",
  "diagnosticId": "<echoed from request>",
  "intakeReferenceCode": "<echoed from request>",
  "correlationId": "<echoed or null>",
  "extraction": {
    "supported": true,
    "fileType": ".txt",
    "byteLength": 1094,
    "charCount": 1094,
    "wordCount": 162,
    "lineCount": 23,
    "sha256": "<hex digest of raw bytes>",
    "extractionWarnings": [],
    "contentReturned": false
  },
  "message": "Diagnostic runner contract accepted. Synthetic TXT extraction verified. AI execution not enabled."
}
```

`contentReturned` is always `false`. Extracted text is never returned. `lineCount` is `null` for DOCX.

### HTTP 202 — Output validation passed

Returned when `verifyOutputValidation: true` and the synthetic output passes all no-quotation rules.

```json
{
  "status": "accepted",
  "mode": "contract-test",
  "diagnosticId": "<echoed>",
  "intakeReferenceCode": "<echoed>",
  "correlationId": null,
  "validation": {
    "valid": true,
    "violations": [],
    "fieldsChecked": ["jm1_diagnosticoutputsummary", "jm1_diagnosticstructuredoutputjson", "..."]
  },
  "message": "Diagnostic runner contract accepted. Synthetic output passed no-quotation validation. AI execution not enabled."
}
```

### HTTP 422 — Output quotation violation

Returned when `verifyOutputValidation: true` and the synthetic output fails a no-quotation rule. Violation objects contain only `field`, `rule`, and `ruleDescription` — never the offending text.

```json
{
  "status": "error",
  "code": "OUTPUT_QUOTATION_VIOLATION",
  "diagnosticId": "<echoed>",
  "validation": {
    "valid": false,
    "violations": [
      {
        "field": "jm1_diagnosticoutputsummary",
        "rule": "QUOTED_CONTENT",
        "ruleDescription": "Field 'jm1_diagnosticoutputsummary' contains quoted text with 7 words. Output must be characterization only — no quoted manuscript prose"
      }
    ],
    "fieldsChecked": ["jm1_diagnosticoutputsummary"]
  },
  "message": "Synthetic output failed no-quotation validation. Output must be characterization only."
}
```

**No-quotation rules applied (all output fields, permanent):**

| Rule | Description |
|---|---|
| `QUOTED_CONTENT` | Text in double/curly quotes with ≥ 4 word tokens — indicates direct manuscript quotation |
| `PROMPT_LEAKAGE` | Known prompt-instruction phrases echoed in output (e.g. "you are a", "given the manuscript") |
| `PROSE_BLOCK` | Unbroken prose span > 300 chars in non-JSON fields — indicates possible verbatim copy |
| `JSON_PROSE_VALUE` | String value > 300 chars in `jm1_diagnosticstructuredoutputjson` |
| `INVALID_JSON` | `jm1_diagnosticstructuredoutputjson` is not valid JSON |
| `UNKNOWN_FIELD` | Field key not in the declared validated output field set |

**Validated output fields:** `jm1_diagnosticoutputsummary`, `jm1_diagnosticstructuredoutputjson`, `jm1_diagnosticriskflags`, `jm1_diagnosticexecutionerror`, `jm1_humanreviewnotes`.

### HTTP 400 — Invalid synthetic fixture

```json
{
  "status": "error",
  "code": "INVALID_SYNTHETIC_FIXTURE",
  "diagnosticId": "<echoed or null>"
}
```

### HTTP 422 — Legacy-excluded

Returned when `legacyFlag: true`. The gate fires before any manuscript access, knowledge verification, or extraction. No AI is called.

```json
{
  "status": "error",
  "code": "LEGACY_EXCLUDED",
  "diagnosticId": "<echoed from request>",
  "message": "This intake is flagged as Legacy and cannot be processed by the Stage 0 Diagnostic Runner. A separate governed Legacy diagnostic path is required."
}
```

### HTTP 503 — Knowledge verification failed

Returned when `verifyKnowledge: true` but the blob is unreachable or the hash does not match.

```json
{
  "status": "error",
  "code": "KNOWLEDGE_VERIFICATION_FAILED",
  "diagnosticId": "<echoed from request>",
  "knowledge": {
    "reachable": false,
    "hashMatched": false,
    "expectedSha256": "<hex digest from env>",
    "error": "<safe error description — no secrets>"
  }
}
```

### HTTP 401 — Unauthorized

```json
{
  "status": "error",
  "code": "UNAUTHORIZED"
}
```

### HTTP 400 — Validation failure

```json
{
  "status": "error",
  "code": "<INVALID_DIAGNOSTIC_ID | INVALID_INTAKE_REFERENCE_CODE | INVALID_CORRELATION_ID | INVALID_JSON>",
  "diagnosticId": "<value or null>"
}
```

## Environment Variables

Defined in `local.settings.example.json`. No values are committed to the repository. Production values are set in Azure Function App settings; secrets are stored in `jm1-core-vault` and referenced via Key Vault reference syntax.

| Variable | Source | Purpose |
|---|---|---|
| `JM1_DIAGNOSTIC_RUNNER_KEY` | Key Vault reference (`jm1-int-pub-005-diagnostic-runner-key`) | Pre-shared key for `x-jm1-diagnostic-runner-key` header authentication |
| `CONTRACT_TEST_MODE` | App setting (plain) | `true` — keeps function in contract-test mode |
| `KNOWLEDGE_BLOB_URL` | App setting (plain) | Full private Blob URL for `knowledge.md`; set to `https://stjm1diagrunner.blob.core.windows.net/knowledge/knowledge.md` |
| `KNOWLEDGE_BLOB_SHA256` | App setting (plain) | Approved SHA-256 hex digest for `knowledge.md` v1.0; set to `64e0e38f8a2cfdacf49fd8238b45939efbafef3bd23d526ab3d0d414b24e8a78` |
| `DATAVERSE_TENANT_ID` | App setting (plain) | Azure AD tenant ID — not used in contract-test mode |
| `DATAVERSE_CLIENT_ID` | App setting | Service principal client ID — set before live use |
| `DATAVERSE_CLIENT_SECRET` | App setting | Service principal secret — set before live use |
| `DATAVERSE_RESOURCE_URL` | App setting (plain) | `https://jm1hq.crm.dynamics.com` — not used in contract-test mode |
| `DATAVERSE_WEB_API_BASE_URL` | App setting (plain) | `https://jm1hq.crm.dynamics.com/api/data/v9.2/` — not used in contract-test mode |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | App setting (from App Insights resource) | Telemetry |
| `AzureWebJobsStorage` | App setting (set by platform) | Function App storage |
| `FUNCTIONS_WORKER_RUNTIME` | App setting (plain) | `node` |

Azure OpenAI / Foundry endpoint and key variables are intentionally absent. They will be added in a separate governed pass, with Jackie's explicit authorization, after the open decisions in the AI execution contract are resolved.

## Canonical Purpose and Identifier Mapping

When real AI execution is authorized, this function executes the Stage 0 diagnostic AI call using the following canonical identifiers:

| Identifier type | Value |
|---|---|
| Agent ID | `jm1-agent-pub-diagnostic-01` |
| Canonical Prompt Template ID | `jm1-prompt-pub-stage0-diagnostic` |
| Operational Prompt Alias / Version Code | `PUB-STAGE0-DIAGNOSTIC-V1` |
| Production deployment alias | `jm1-pub-diagnostic-primary` |
| Safe-test deployment alias | `jm1-pub-diagnostic-safe-test` |

These identifiers must resolve consistently across ADR-008 (agent registry), ADR-011 (prompt template governance), and this runner. No AI call may proceed with an unregistered alias or unresolvable prompt ID.

## No-Manuscript-Quotation Rule

All output written by this runner — to Dataverse fields, AI Request Log, or Execution Log — must be characterization only. No field may contain:

- Manuscript excerpts or verbatim passages
- Quoted author-submitted prose
- Any raw text extracted from the manuscript file

This rule applies to `jm1_diagnosticoutputsummary`, `jm1_diagnosticstructuredoutputjson`, `jm1_diagnosticriskflags`, `jm1_airequestlog`, `jm1_executionlog`, and all error and notes fields.

## Legacy-Exclusion Rule

This runner must not process any manuscript associated with a Legacy-flagged intake or Legacy route. If a Legacy flag is detected during pre-flight:

- Return a safe error without calling any AI endpoint
- Set `jm1_diagnosticexecutionstatus` to Deferred or Exception with a safe internal note
- Do not read or extract the manuscript file

Legacy diagnostic processing requires a separate governed path approved by Jackie.

## Execution Boundary

### Permitted in this pass (contract-test mode)

- Validate request authentication
- Validate request payload fields
- Return safe contract-test confirmation

### Permitted when AI execution is authorized (future)

- Read Editorial Diagnostic and Publishing Intake metadata
- Read the approved manuscript file (DOCX or TXT only) transiently in memory
- Call the approved AI deployment alias using the approved prompt template
- Write diagnostic results to approved Dataverse output fields
- Write to `jm1_airequestlog` and `jm1_executionlog` (no raw manuscript text)

### Prohibited (permanent)

- Opportunity creation
- Author email send
- Publishing package selection or commitment
- Processing historical rows
- Storing raw manuscript text in any persistent medium
- Reading Legacy-flagged manuscripts
- Reading PDF or scanned-file formats (deferred)
- Calling `JM1 PUB - Run Diagnostic AI Assessment`
- Committing manuscript content, prompt text, secrets, tokens, headers, cookies, or PII to logs or repo

### Prohibited until explicitly authorized

- Any AI call (Azure OpenAI, Foundry, OpenAI, or any other endpoint)
- Changing `CONTRACT_TEST_MODE` from `true` to `false`
- Manuscript file access

## File Structure

```
azure-functions/diagnostic-ai-runner/
├── package.json
├── host.json
├── .funcignore
├── local.settings.example.json
├── src/
│   ├── functions/
│   │   └── runStage0Diagnostic.js       — POST /api/run-stage0-diagnostic
│   ├── blob/
│   │   └── knowledgeReader.js           — Blob read + SHA-256 verification via managed identity
│   ├── extraction/
│   │   └── manuscriptExtractor.js       — DOCX/TXT transient extraction (metadata only)
│   ├── preflight/
│   │   └── legacyExclusionCheck.js      — Legacy-exclusion pre-flight gate
│   ├── validation/
│   │   └── noQuotationValidator.js      — No-quotation output field validator
│   ├── routing/
│   │   └── confidenceRouter.js          — Confidence-based routing (pure logic, no side effects)
│   ├── dataverse/
│   │   ├── client.js                    — config validation stub (no live reads)
│   │   └── metadataWriter.js            — safe metadata writer for jm1_airequestlog + jm1_executionlog
│   ├── activation/
│   │   └── aiExecutionGate.js           — dual-gate guard (CONTRACT_TEST_MODE + JM1_AI_EXECUTION_ENABLED)
│   └── ai/
│       └── modelCaller.js              — Azure OpenAI caller scaffold (gate-enforced; inactive until Approval 1)
└── test/
    ├── validation.test.js               — payload pattern validation
    ├── knowledge.test.js                — knowledge.md SHA-256 and Blob verification
    ├── extraction.test.js               — extraction metadata safety and correctness
    ├── confidenceRouting.test.js        — Confidence routing (all 5 paths, thresholds, invariants)
    ├── legacyExclusion.test.js          — Legacy-exclusion gate and flag parsing
    ├── noQuotationValidation.test.js    — No-quotation output validation rules and safety
    ├── metadataWrite.test.js            — Metadata writer payload safety and prohibited field tests
    ├── syntheticE2E.test.js             — Synthetic end-to-end pipeline stage chain tests
    ├── aiActivationGate.test.js         — Dual-gate logic and model caller gate enforcement (23 tests)
    └── fixtures/
        ├── synthetic-stage0.txt         — synthetic TXT fixture (no real content)
        └── synthetic-stage0.docx        — synthetic DOCX fixture (no real content)
```

## AI Execution Dual-Gate

AI execution is guarded by two independent gates. Both must be open before any model call is attempted:

| Gate | Mechanism | Current state | Opens when |
|---|---|---|---|
| 1. `CONTRACT_TEST_MODE` | Hardcoded constant in `runStage0Diagnostic.js` | `true` — closed | Code change + Jackie Approval 1 |
| 2. `JM1_AI_EXECUTION_ENABLED` | Azure Function app setting (env var) | absent / `false` — closed | Env var set to `"true"` after Approval 1 |

Neither gate alone is sufficient. A request that passes Gate 1 but not Gate 2 is still blocked. A request that satisfies Gate 2 in env vars but CONTRACT_TEST_MODE is still `true` is still blocked.

Gate state is returned on every `controlledAiTest: true` request so the caller can confirm which gates are closed and why.

### `controlledAiTest` request behaviour

| Gate state | HTTP status | `status` field | Response includes |
|---|---|---|---|
| Both gates closed (current) | 200 | `gate-closed` | `gate.permitted=false`, `gate.reason`, `gate.contractTestModeActive`, `gate.aiExecutionEnabled` |
| Both gates open (post-approval) | 202 | `accepted` | Full pipeline result including `diagnosticOutput` (Jackie review required) |
| Model call fails | 503 | `error` | Error code, gate state, token counts |
| Output validation fails | 422 | `error` | Violation details, token counts |

### Live gate-closed verification (2026-06-17)

```
POST /api/run-stage0-diagnostic
{ "controlledAiTest": true, "syntheticFixture": "txt", ... }

→ 200
{
  "status": "gate-closed",
  "mode": "contract-test",
  "gate": {
    "permitted": false,
    "reason": "CONTRACT_TEST_MODE_ACTIVE",
    "contractTestModeActive": true,
    "aiExecutionEnabled": false
  }
}
```

`CONTRACT_TEST_MODE=true`. No model call attempted. No manuscript processed.

## Flow D Integration (Future)

When AI execution is authorized, Flow D's true branch (`Condition_Manuscript_Asset_Ready` true) will call this function via an HTTP action with the following inputs:

| Input | Source in Flow D |
|---|---|
| `diagnosticId` | Trigger record ID (`triggerOutputs()?['body/jm1pub_editorialdiagnosticid']`) |
| `intakeReferenceCode` | Related Publishing Intake `jm1_intakereferencecode` |
| `correlationId` | `jm1_diagnosticcorrelationid` from the diagnostic record |
| `x-jm1-diagnostic-runner-key` | Flow D environment variable (not committed) |

Flow D integration is not implemented in this pass. The true branch currently routes to a deferred update.

## Confidence Routing Verification

Confidence-based routing was verified via direct HTTP contract test on 2026-06-17 for all five routing outcomes.

| Routing path | Input | `routing.status` | `routing.statusLabel` | `requiresHumanReview` | `lowConfidenceNote` |
|---|---|---|---|---|---|
| Completed | `confidence: 0.90` | `835500002` | `Completed` | `true` | `null` |
| Needs Human Review mid | `confidence: 0.75` | `835500004` | `Needs Human Review` | `true` | `null` |
| Needs Human Review low | `confidence: 0.50` | `835500004` | `Needs Human Review` | `true` | Set with confidence value |
| Exception | `technicalFailure: true` | `835500003` | `Exception` | `true` | `null` |
| Deferred | `manuscriptGateFailure: true` | `835500005` | `Deferred` | `true` | `null` |

All paths returned HTTP 202. `requiresHumanReview` was `true` on every path. No Dataverse write occurred. AI execution not enabled.

Routing priority order confirmed: manuscriptGateFailure → technicalFailure → confidence thresholds. Missing or invalid confidence routes to Exception.

## No-Quotation Output Validation Verification

No-quotation output validation was verified via direct HTTP contract test on 2026-06-17.

| Test case | HTTP status | Result |
|---|---|---|
| Clean characterization output (5 fields, all clean) | 202 | `valid: true`, all fields checked |
| Output with ASCII double-quoted prose span (7 words) | 422 | `QUOTED_CONTENT` violation on `jm1_diagnosticoutputsummary` |
| Output with prompt-instruction phrase ("You are a...") | 422 | `PROMPT_LEAKAGE` violation on `jm1_diagnosticoutputsummary` |
| `legacyFlag: true` + `verifyOutputValidation: true` (gate ordering) | 422 | `LEGACY_EXCLUDED` — Legacy gate fires before output validation |

Violation objects contain only `field`, `rule`, and `ruleDescription`. No offending text appears in any response field. `CONTRACT_TEST_MODE=true`. No AI was called. No Dataverse writes occurred.

## Synthetic End-to-End Pipeline Verification

The full 5-stage synthetic pipeline was verified via live HTTP contract tests on 2026-06-17 using `verifyFullPipeline: true`.

### Pipeline Stages

| Stage | Component | Contract |
|---|---|---|
| 1 | Legacy-exclusion gate | `legacyFlag: true` returns 422 before any downstream stage |
| 2 | Knowledge verification | `knowledge.md` read, SHA-256 verified (`64e0e38f…`), `reachable=true`, `hashMatched=true` |
| 3 | Synthetic extraction | DOCX (52 words, 1704 bytes) or TXT (153 words, 1094 bytes); `contentReturned=false` always |
| 4 | Output validation | Clean synthetic output passes; quoted prose or prompt leakage returns 422 |
| 5 | Confidence routing | All 5 routing paths available; `requiresHumanReview=true` on every path |
| 6 | Metadata writes | Both `jm1_airequestlog` and `jm1_executionlog` created; prohibited fields null |

### Live E2E Test Results (2026-06-17)

| Test | Fixture | Confidence | Result | AI Request Log ID | Execution Log ID |
|---|---|---|---|---|---|
| High confidence → Completed | DOCX | 0.90 | 202 — all 5 stages passed, status 835500002 | `62724728-226a-f111-a826-6045bdd69678` | `fad33c2d-226a-f111-a826-7c1e525b15c2` |
| Low confidence → Needs Human Review | TXT | 0.50 | 202 — all 5 stages passed, status 835500004, lowConfidenceNote set | `dc7e6879-226a-f111-a826-6045bdd69738` | `5ed98575-226a-f111-a826-6045bdd69678` |
| Legacy gate blocks pipeline | DOCX | 0.90 | 422 LEGACY_EXCLUDED — no downstream stages ran | — | — |

`CONTRACT_TEST_MODE=true`. No AI called. No real manuscript processed. No Flow D modified. No Opportunity created. No author email sent.

## Metadata Write Verification

Safe metadata writes to `jm1_airequestlog` and `jm1_executionlog` were verified via live HTTP contract test on 2026-06-17.

### Dataverse Schema

| Table | Logical Name | Entity Set Name |
|---|---|---|
| AI Request Log | `jm1_airequestlog` | `jm1_airequestlogs` |
| Execution Log | `jm1_executionlog` | `jm1_executionlogs` |

### Authentication

Runner managed identity (`func-jm1-diagnostic-ai-runner`, MSI appId `dc8d1429-8c1b-473b-83ca-f9545fad8074`) registered as Dataverse application user (systemuserid `cb6e97e5-1d6a-f111-a826-000d3a9eacee`). Role: `JM1 Publishing Intake API - Create Only` with additional privileges `prvCreatejm1_AIRequestLog`, `prvWritejm1_AIRequestLog`, `prvReadjm1_AIRequestLog`, `prvCreatejm1_ExecutionLog`, `prvWritejm1_ExecutionLog`, `prvReadjm1_ExecutionLog`. Token acquired via `DefaultAzureCredential` (MSI on Azure). No client secret committed.

### Metadata Fields Written

**`jm1_airequestlog` safe fields:**

| Field | Value written |
|---|---|
| `jm1_agentname` | `jm1-diagnostic-ai-runner` |
| `jm1_agentversion` | `1.0.0` |
| `jm1_airequestid` | correlationId or diagnosticId |
| `jm1_modeldeployment` | `jm1-pub-diagnostic-safe-test` |
| `jm1_modelprovider` | `835500000` (Azure OpenAI) |
| `jm1_promptname` | `jm1-prompt-pub-stage0-diagnostic` |
| `jm1_promptversion` | `PUB-STAGE0-DIAGNOSTIC-V1` |
| `jm1_requeststatus` | `835500002` (Completed) or `835500003` (Failed) |
| `jm1_requesttimestamp` | ISO 8601 UTC |
| `jm1_responsetimestamp` | ISO 8601 UTC |
| `jm1_requesttype` | `835500000` (Diagnostic) |
| `jm1_sourcebrand` | `835500001` (J Merrill Publishing) |
| `jm1_sourceentity` | `jm1pub_editorialdiagnostic` |
| `jm1_sourcerecordid` | diagnosticId |
| `jm1_sourcesystem` | `jm1-diagnostic-ai-runner` |
| `jm1_humanreviewrequired` | `true` always |
| `jm1_confidence` | numeric confidence if set |
| `jm1_actualinputtokens` | `0` (contract-test) |
| `jm1_actualoutputtokens` | `0` (contract-test) |
| `jm1_flowrunid` | correlationId or null |
| `jm1_contentdisclosurerequired` | `false` |

**`jm1_executionlog` safe fields:**

| Field | Value written |
|---|---|
| `jm1_agentname` | `jm1-diagnostic-ai-runner` |
| `jm1_agentmodel` | `jm1-pub-diagnostic-safe-test` |
| `jm1_actiontype` | `Stage0DiagnosticRun` |
| `jm1_actiondescription` | Mode + reference code + safety statement |
| `jm1_bandlevel` | `835500000` (Band 1) |
| `jm1_executionstatus` | `835500001` (Success) or `835500002` (Failed) |
| `jm1_startedon` | ISO 8601 UTC |
| `jm1_completedon` | ISO 8601 UTC |
| `jm1_sourceentity` | `jm1pub_editorialdiagnostic` |
| `jm1_sourcerecordid` | diagnosticId |

### Prohibited Fields

The following fields are **never set** by `metadataWriter.js`:

| Field | Reason |
|---|---|
| `jm1_requestpayload` | Prompt body text — prohibited |
| `jm1_responsepayload` | AI model output — prohibited |
| `jm1_airecommendation` | AI model recommendation — prohibited |
| Any manuscript text | Prohibited in all fields |
| Any extracted text | Prohibited in all fields |
| Secrets, headers, tokens, PII | Prohibited in all fields |

### Live Contract Test Result (2026-06-17)

Request: `verifyMetadataWrites: true`, `confidence: 0.9`, `requiresHumanReview: true`, `intakeReferenceCode: JMP-INT-260617-METADATA-TEST`

| Record | Created | ID |
|---|---|---|
| AI Request Log | `true` | `3435a7f9-206a-f111-a826-00224820105b` |
| Execution Log | `true` | `62ec86f8-206a-f111-a826-6045bdd69678` |

Dataverse inspection confirmed: `jm1_requestpayload=null`, `jm1_responsepayload=null`, `jm1_airecommendation=null`. No manuscript text, prompt body, model output, secrets, headers, or tokens stored. `CONTRACT_TEST_MODE=true`. No AI was called. No Opportunity created. No author email sent. No Flow D modified.

### Rollback / Cleanup Note

Synthetic contract-test records (`3435a7f9...` and `62ec86f8...`) are retained as audit evidence of the metadata write scaffold verification. If cleanup is required, both records can be deleted by Dataverse admin. Future runs with `verifyMetadataWrites: true` will create new synthetic records; these should be periodically purged or tagged to distinguish from production records.

## Legacy-Exclusion Gate Verification

Legacy-exclusion pre-flight gate was verified via direct HTTP contract test on 2026-06-17 (post gate deployment).

| Test case | HTTP status | Response code |
|---|---|---|
| `legacyFlag: true` | 422 | `LEGACY_EXCLUDED` |
| `legacyFlag: true` + `verifyExtraction: true` (gate fires first) | 422 | `LEGACY_EXCLUDED` |
| `legacyFlag` absent (normal path) | 202 | — |
| `legacyFlag: false` (non-Legacy) | 202 | — |

No manuscript was accessed. No AI was called. No Dataverse writes occurred. `CONTRACT_TEST_MODE=true`.

In production, `legacyFlag` will be resolved from the Dataverse record (Publishing Intake or Editorial Diagnostic) before the gate check. The gate location in the runner (before knowledge verification, before extraction) is permanent.

## Synthetic Extraction Verification

Synthetic DOCX and TXT extraction was verified via direct HTTP contract test on 2026-06-17 (post extraction scaffold deployment).

### TXT fixture

| Field | Result |
|---|---|
| HTTP status | 202 |
| `extraction.supported` | `true` |
| `extraction.fileType` | `.txt` |
| `extraction.byteLength` | `1094` |
| `extraction.charCount` | `1094` |
| `extraction.wordCount` | `153` |
| `extraction.lineCount` | `27` |
| `extraction.sha256` | `a9bceb94530e0711e0a27d1cae38da32226337c6232b668aeb2429d8b9383a79` |
| `extraction.contentReturned` | `false` |
| Extracted text in response | Not present — metadata only |
| Runner mode | `CONTRACT_TEST_MODE=true` |

### DOCX fixture

| Field | Result |
|---|---|
| HTTP status | 202 |
| `extraction.supported` | `true` |
| `extraction.fileType` | `.docx` |
| `extraction.byteLength` | `1704` |
| `extraction.charCount` | `331` |
| `extraction.wordCount` | `52` |
| `extraction.lineCount` | `null` (not applicable for DOCX) |
| `extraction.sha256` | `844b0ad405569f6becbd8074743567a3a73c70c3a6df9d2d28b9e564da09e869` |
| `extraction.contentReturned` | `false` |
| Extracted text in response | Not present — metadata only |
| Runner mode | `CONTRACT_TEST_MODE=true` |

### Invalid fixture guard

| Test | HTTP status |
|---|---|
| `syntheticFixture: "pdf"` with `verifyExtraction: true` | `400 INVALID_SYNTHETIC_FIXTURE` |

No real manuscript content was used. No AI was called. No Dataverse writes occurred.

## Related Documents

- [`docs/operations/int-pub-005-stage0-diagnostic-ai-execution-contract.md`](./int-pub-005-stage0-diagnostic-ai-execution-contract.md) — AI execution contract governing the future AI call
- [`docs/operations/int-pub-005-stage0-diagnostic-execution-contract.md`](./int-pub-005-stage0-diagnostic-execution-contract.md) — Flow D execution contract and manuscript asset gate
- [`docs/testing/int-pub-005-join-intake-validation.md`](../testing/int-pub-005-join-intake-validation.md) — Validation log including contract-test confirmation
