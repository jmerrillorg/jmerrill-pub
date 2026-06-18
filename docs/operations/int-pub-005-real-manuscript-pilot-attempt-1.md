# INT-PUB-005 — Real-Manuscript Pilot Attempt 1: Result Record

**Date:** 2026-06-18
**PR:** #77
**Authorization basis:** Approval 2 (recorded in PR #74)
**Status: FAILED — no valid diagnostic result produced**

---

## Call Record

| Field | Value |
|---|---|
| diagnosticId | `64e387e0-7e6a-f111-a826-00224820105b` |
| intakeReferenceCode | `JMP-INT-202606-UFYG60` |
| provider | anthropic |
| model | claude-sonnet-4-6 |
| executionMode | real-manuscript-pilot |

---

## Gate State

| Event | State |
|---|---|
| Gate before call | open (`JM1_AI_EXECUTION_ENABLED=true`) |
| Gate after call | closed (`JM1_AI_EXECUTION_ENABLED=false`) |

Gate was opened immediately before the call and closed immediately after. No second call was made.

---

## Stage Results

| Stage | Result |
|---|---|
| Dataverse record read | passed |
| Manuscript asset gate (`jm1_manuscriptapprovedfordiagnostic`) | passed |
| Graph-authenticated SharePoint download | passed |
| Manuscript extraction | passed |
| Real manuscript content injected into prompt | yes |
| Model call | occurred |
| Model response parsed as structured JSON | **failed** |
| Valid diagnostic output produced | **no** |

---

## Token Usage

| Metric | Value |
|---|---|
| Input tokens | 73,510 |
| Output tokens | 1,200 |
| Total tokens | 74,710 |

The 73,510 input tokens confirm the manuscript text was injected into the prompt. The model responded (1,200 output tokens), but the response did not conform to the required JSON structure.

---

## Error

```
HTTP status:  error
error code:   MODEL_RESPONSE_NOT_JSON
failedStage:  modelCall
```

The runner's JSON parser rejected the model response. The model output is not included in this record — it may contain content derived from the manuscript and must not be stored or returned outside the execution context.

---

## What Was Not Produced

- No `jm1_diagnosticoutputsummary` written to Dataverse
- No `jm1_diagnosticriskflags` written to Dataverse
- No confidence score
- No author-facing output
- No author email
- No Opportunity
- Flow D: unchanged

---

## What Was Confirmed Working

This call confirmed the full infrastructure chain through the model call stage:

1. Managed identity read from Dataverse — working
2. Asset gate check — working
3. Microsoft Graph authenticated SharePoint download — **working** (this was the blocker resolved in PR #76)
4. Manuscript extraction (.docx → text) — working
5. Prompt construction and model submission — working
6. Gate enforcement (open before, closed after) — working

The only failure was in output parsing: the model did not return the structured JSON format the runner requires.

---

## Authorization Status

This was the **one authorized real-manuscript pilot call** under Approval 2.

Approval 2 does not automatically authorize a second call. A rerun requires:

1. A structured-output fix reviewed and merged (proposed as PR #78)
2. A new explicit Jackie decision

No second call will be made without that authorization.

---

## Recommended Next Step

**PR #78 — Enforce Structured JSON Output for Real-Manuscript Diagnostic Calls**

PR #78 should address:

- Stronger JSON-only instruction in the prompt
- Provider-level structured output or tool/function schema enforcement if supported by the provider
- Output repair only if safe and manuscript text is not exposed in any repair path
- Parser diagnostics that do not store raw model output
- Tests proving malformed model output fails safely without exposing content
- No real manuscript rerun during PR #78 development or review
