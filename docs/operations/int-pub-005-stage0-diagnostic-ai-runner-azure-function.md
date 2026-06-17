# INT-PUB-005 Stage 0 Diagnostic AI Runner — Azure Function

## Purpose

This document describes the architecture, contract, and operational boundary for the `jm1-diagnostic-ai-runner` Azure Function. This function is the approved execution vehicle for the future side-effect-free INT-PUB-005 Stage 0 diagnostic AI call.

**Current status:** Contract-test mode only. `CONTRACT_TEST_MODE=true`. Real AI execution is not enabled. The runner validates requests, enforces the Legacy-exclusion pre-flight gate, optionally reads and verifies the `knowledge.md` grounding file via managed identity, and optionally runs DOCX/TXT extraction verification against synthetic fixtures. It returns HTTP 202 with a safe contract-test confirmation. It does not call any AI endpoint, read real manuscripts, or write Dataverse.

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
- Returns HTTP 202 with a safe confirmation JSON (including safe knowledge metadata or extraction metadata if requested)
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
| `verifyKnowledge` | No | `true` (boolean) to trigger `knowledge.md` Blob read and SHA-256 verification |
| `verifyExtraction` | No | `true` (boolean) to trigger synthetic-fixture extraction verification — requires `syntheticFixture` |
| `syntheticFixture` | No | `"txt"` or `"docx"` — selects the synthetic test fixture for extraction verification; only valid when `verifyExtraction: true` |

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
│   └── dataverse/
│       └── client.js                    — config validation stub (no live reads)
└── test/
    ├── validation.test.js               — payload pattern validation
    ├── knowledge.test.js                — knowledge.md SHA-256 and Blob verification
    ├── extraction.test.js               — extraction metadata safety and correctness
    ├── legacyExclusion.test.js          — Legacy-exclusion gate and flag parsing
    └── fixtures/
        ├── synthetic-stage0.txt         — synthetic TXT fixture (no real content)
        └── synthetic-stage0.docx        — synthetic DOCX fixture (no real content)
```

## Flow D Integration (Future)

When AI execution is authorized, Flow D's true branch (`Condition_Manuscript_Asset_Ready` true) will call this function via an HTTP action with the following inputs:

| Input | Source in Flow D |
|---|---|
| `diagnosticId` | Trigger record ID (`triggerOutputs()?['body/jm1pub_editorialdiagnosticid']`) |
| `intakeReferenceCode` | Related Publishing Intake `jm1_intakereferencecode` |
| `correlationId` | `jm1_diagnosticcorrelationid` from the diagnostic record |
| `x-jm1-diagnostic-runner-key` | Flow D environment variable (not committed) |

Flow D integration is not implemented in this pass. The true branch currently routes to a deferred update.

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
