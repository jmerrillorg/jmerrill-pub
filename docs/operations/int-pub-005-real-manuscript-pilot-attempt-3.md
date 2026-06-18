# INT-PUB-005 — Real-Manuscript Pilot Attempt 3: Result Record

**Date:** 2026-06-18
**PR:** #81
**Authorization basis:** Jackie verbal authorization, 2026-06-18 — one third limited attempt after PR #80 merged
**Status: FAILED — no-quotation output validation failed closed; no valid diagnostic result produced**

---

## Call Record

| Field | Value |
|---|---|
| diagnosticId | `64e387e0-7e6a-f111-a826-00224820105b` |
| intakeReferenceCode | `JMP-INT-202606-UFYG60` |
| manuscript | Establishing Glory: The Library |
| provider | anthropic |
| model | claude-sonnet-4-6 |
| executionMode | real-manuscript-pilot |

---

## Gate State

| Event | State |
|---|---|
| Gate before call | open (`JM1_AI_EXECUTION_ENABLED=true`) |
| Gate after call | closed (`JM1_AI_EXECUTION_ENABLED=false`) |

Gate was opened for one authorized call and closed immediately afterward. No additional calls were made.

---

## Stage Results

| Stage | Result |
|---|---|
| Dataverse record read | passed |
| Manuscript asset gate (`jm1_manuscriptapprovedfordiagnostic`) | passed |
| Graph-authenticated SharePoint download | passed |
| DOCX extraction | passed |
| Real manuscript content injected into prompt | yes |
| Anthropic tool-use path reached | yes |
| Tool `submit_stage0_diagnostic` called | yes |
| Tool input passed schema validation | **passed** |
| Tool input passed no-quotation / output validation | **failed** |
| Valid diagnostic output produced | **no** |

---

## Token Usage

| Metric | Value |
|---|---|
| Input tokens | 74,707 |
| Output tokens | 514 |
| Total tokens | 75,221 |

---

## Error

```
status:       error
code:         PILOT_OUTPUT_QUOTATION_VIOLATION
failedStage:  outputValidation
```

### Violations

| # | Field | Rule | Detail |
|---|---|---|---|
| 1 | `jm1_diagnosticoutputsummary` | `PROSE_BLOCK` | Prose block of 313 characters exceeded 300-character limit |
| 2 | `jm1_diagnosticriskflags` | `PROSE_BLOCK` | Prose block of 453 characters exceeded 300-character limit |

Fields checked: `jm1_diagnosticoutputsummary`, `jm1_diagnosticriskflags`

The `PROSE_BLOCK` rule flags unbroken prose spans exceeding 300 characters within a single sentence boundary. Both text fields contained extended prose rather than concise, sentence-bounded characterization. No quoted content or prompt leakage was detected — only prose length.

The raw tool response is not included in this record. It may contain content derived from the manuscript and must not be stored or returned outside the execution context.

---

## Progression Across All Attempts

| Attempt | PR | Failed Stage | Code | What This Confirmed |
|---|---|---|---|---|
| 1 | #77 | `modelCall` | `MODEL_RESPONSE_NOT_JSON` | Download and extraction working; model reached |
| 2 | #79 | `schemaValidation` | `PILOT_OUTPUT_SCHEMA_INVALID` | Tool-use path reached; tool called; three fields missing |
| 3 | #81 | `outputValidation` | `PILOT_OUTPUT_QUOTATION_VIOLATION` | Tool called; all four fields present; schema passed; prose length exceeded limit |

Each successive attempt passed one more gate. The tool-use completeness fix from PR #80 worked — schema validation passed for the first time. The remaining gap is output brevity: the model produced valid structured output but wrote extended prose blocks rather than concise characterization.

---

## What Was Not Produced

- No `jm1_diagnosticoutputsummary` written to Dataverse (output validation failed before write)
- No `jm1_diagnosticriskflags` written to Dataverse
- No confidence score written
- No author-facing output
- No author email
- No Opportunity
- Flow D: unchanged
- No additional manuscript processed

---

## Authorization Status

This was the third authorized real-manuscript pilot call. The authorization covered one attempt only.

A fourth attempt requires a new explicit Jackie decision after an output brevity fix is reviewed and merged.

No fourth call will be made without that authorization.

---

## Root Cause Assessment

The `PROSE_BLOCK` rule in `noQuotationValidator.js` rejects any prose span exceeding 300 characters within a sentence boundary. The model's tool output for both string fields contained single-sentence prose blocks longer than this limit.

Contributing factors:

- The prompt instructions specify "2–4 sentences" and "1–3 sentences" per field, but do not specify a character limit
- The tool schema field descriptions do not include a character constraint
- The `PROSE_BLOCK` limit is a fixed internal rule (300 chars), not visible to the model
- Risk flags in particular were written as an extended paragraph rather than concise categorical labels

---

## Recommended Next Step

**PR #82 — Constrain Diagnostic Output Brevity for No-Quotation Validation**

PR #82 should address:

- Explicit character limits per text field in the prompt instruction (e.g., "under 250 characters")
- Sentence-count limits that keep each sentence short enough to stay within the prose-block threshold
- Risk flags written as concise labels or short phrases, not paragraphs
- Tool schema `description` fields updated to include character constraint guidance
- Prompt instructions requiring short, bounded characterization — no multi-clause sentences
- Tests proving long prose blocks fail `noQuotationValidator` closed
- Tests proving concise output passes `noQuotationValidator`
- No real manuscript rerun during PR #82 development or review
