# INT-PUB-005 — Real-Manuscript Pilot Attempt 2: Result Record

**Date:** 2026-06-18
**PR:** #79
**Authorization basis:** Jackie verbal authorization, 2026-06-18 — one second limited attempt after PR #78 merged
**Status: FAILED — schema validation caught incomplete tool output; no valid diagnostic result produced**

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
| Tool input passed schema validation | **failed** |
| Valid diagnostic output produced | **no** |

---

## Token Usage

| Metric | Value |
|---|---|
| Input tokens | 74,385 |
| Output tokens | 1,200 |
| Total tokens | 75,585 |

The 74,385 input tokens confirm the manuscript was injected into the prompt. The model called the tool and produced 1,200 output tokens, but the tool input object was incomplete.

---

## Error

```
status:       error
code:         PILOT_OUTPUT_SCHEMA_INVALID
failedStage:  schemaValidation
schemaErrors:
  - jm1_diagnosticriskflags: required non-empty string
  - jm1_confidence: required finite number between 0.0 and 1.0
  - jm1_requireshumanreview: must be boolean true
```

Three of four required tool input fields were absent or invalid. Only `jm1_diagnosticoutputsummary` was present. The PR #78 schema validator caught this and failed closed. No incomplete output reached the no-quotation gate or Dataverse write.

The raw tool response is not included in this record — it may contain content derived from the manuscript.

---

## Progress Relative to Attempt 1 (PR #77)

| Layer | Attempt 1 (PR #77) | Attempt 2 (PR #79) |
|---|---|---|
| Graph-authenticated download | passed | passed |
| Tool-use path | not reached | **reached** |
| Tool called | no | **yes** |
| Failure mode | `MODEL_RESPONSE_NOT_JSON` | `PILOT_OUTPUT_SCHEMA_INVALID` |
| Schema validation gate | not present | **active and caught failure** |
| No-quotation gate reached | no | no (failed before it) |

The freeform JSON parsing failure from Attempt 1 is resolved. The tool-use path is working. The remaining gap is prompt completeness: the model called the tool but populated only one of four required fields.

---

## What Was Not Produced

- No `jm1_diagnosticoutputsummary` written to Dataverse (schema failed before write)
- No `jm1_diagnosticriskflags` written to Dataverse
- No confidence score
- No author-facing output
- No author email
- No Opportunity
- Flow D: unchanged
- No additional manuscript processed

---

## Authorization Status

This was the second authorized real-manuscript pilot call. The authorization covered one attempt only.

A third attempt requires a new explicit Jackie decision after a tool-use completeness fix is reviewed and merged.

No third call will be made without that authorization.

---

## Root Cause Assessment

The Anthropic tool-use API enforced the call but did not enforce field completeness within the tool input. The `required` array in `input_schema` constrains what the API validates, but the model populated only `jm1_diagnosticoutputsummary`. Likely contributing factors:

- Prompt instruction does not explicitly enumerate all required fields with per-field guidance
- `max_tokens: 1200` may have been insufficient for the model to complete all four fields after processing a 74,000+ token input
- Tool description instructs what the tool does, but user message does not explicitly instruct the model to populate every field

---

## Recommended Next Step

**PR #80 — Improve Tool-Use Completeness for Real-Manuscript Diagnostic Output**

PR #80 should address:

- Explicit per-field instruction in the user message (enumerate each required field with its type and constraint)
- Raise `max_tokens` to accommodate complete four-field tool output after large manuscript input
- Stronger instruction that all required fields must be populated before calling the tool
- Schema example in the prompt (field names and expected value types, without manuscript content)
- Tests proving that a tool input missing any required field fails schema validation closed
- Tests proving a complete, valid tool input passes schema validation
- No real manuscript rerun during PR #80 development or review
