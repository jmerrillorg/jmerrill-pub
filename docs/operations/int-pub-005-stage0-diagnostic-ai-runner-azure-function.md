# INT-PUB-005 Stage 0 Diagnostic AI Runner — Azure Function

## Purpose

This document describes the architecture, contract, and operational boundary for the `jm1-diagnostic-ai-runner` Azure Function. This function is the approved execution vehicle for the future side-effect-free INT-PUB-005 Stage 0 diagnostic AI call.

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

## Current Mode

**Contract-test mode.** `CONTRACT_TEST_MODE = true` in `src/functions/runStage0Diagnostic.js`.

In contract-test mode, the function:

- Validates the `x-jm1-diagnostic-runner-key` header
- Validates the request payload (diagnosticId, intakeReferenceCode, correlationId)
- Returns HTTP 202 with a safe confirmation JSON
- Does not call any AI service
- Does not read or write Dataverse
- Does not access SharePoint or the manuscript file

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
  "correlationId": "<optional correlation key for log matching>"
}
```

| Field | Required | Validation |
|---|---|---|
| `diagnosticId` | Yes | UUID format (`/^[0-9a-f]{8}-[0-9a-f]{4}-…$/i`) |
| `intakeReferenceCode` | Yes | JMP-INT reference pattern (`/^JMP-INT-\d{6}-[A-Z0-9-]+$/i`) |
| `correlationId` | No | Alphanumeric, hyphens, underscores; max 100 characters |

## Response Contract

### HTTP 202 — Contract-test accepted

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

Defined in `local.settings.example.json`. No values are committed to the repository.

| Variable | Purpose |
|---|---|
| `JM1_DIAGNOSTIC_RUNNER_KEY` | Pre-shared key for `x-jm1-diagnostic-runner-key` header authentication |
| `DATAVERSE_ENDPOINT` | Dataverse Web API base URL (e.g. `https://jm1hq.crm.dynamics.com`) — validated by config stub, not used in contract-test mode |
| `DATAVERSE_CLIENT_ID` | Service principal client ID for Dataverse access — validated by config stub, not used in contract-test mode |
| `DATAVERSE_TENANT_ID` | Azure AD tenant ID — validated by config stub, not used in contract-test mode |

Azure OpenAI / Foundry endpoint and key variables are intentionally absent. They will be added in a separate governed pass, with Jackie's explicit authorization, after the open decisions in the AI execution contract are resolved.

## Execution Boundary

### Permitted in this pass (contract-test mode)

- Validate request authentication
- Validate request payload fields
- Return safe contract-test confirmation

### Prohibited (permanent)

- Opportunity creation
- Author email send
- Publishing package selection or commitment
- Processing historical rows
- Reading, downloading, attaching, moving, or exposing real manuscript files
- Committing manuscript content, prompt text, secrets, tokens, headers, cookies, or PII
- Calling `JM1 PUB - Run Diagnostic AI Assessment`

### Prohibited until explicitly authorized

- Any AI call (Azure OpenAI, Foundry, OpenAI, or any other endpoint)
- Dataverse reads or writes
- SharePoint access

## File Structure

```
azure-functions/diagnostic-ai-runner/
├── package.json
├── host.json
├── .funcignore
├── local.settings.example.json
├── src/
│   ├── functions/
│   │   └── runStage0Diagnostic.js   — POST /api/run-stage0-diagnostic
│   └── dataverse/
│       └── client.js                — config validation stub (no live reads)
└── test/
    └── validation.test.js           — pattern validation unit tests
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

## Related Documents

- [`docs/operations/int-pub-005-stage0-diagnostic-ai-execution-contract.md`](./int-pub-005-stage0-diagnostic-ai-execution-contract.md) — AI execution contract governing the future AI call
- [`docs/operations/int-pub-005-stage0-diagnostic-execution-contract.md`](./int-pub-005-stage0-diagnostic-execution-contract.md) — Flow D execution contract and manuscript asset gate
- [`docs/testing/int-pub-005-join-intake-validation.md`](../testing/int-pub-005-join-intake-validation.md) — Validation log including contract-test confirmation
