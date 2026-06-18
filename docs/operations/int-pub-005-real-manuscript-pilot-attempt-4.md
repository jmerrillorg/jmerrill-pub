# INT-PUB-005 - Real-Manuscript Pilot Attempt 4: Result Record

**Date:** 2026-06-18
**PR:** #83
**Authorization basis:** Jackie explicit authorization, 2026-06-18 - one fourth limited attempt after PR #81 and PR #82 merged and PR #82 deployed
**Status: PASSED - corrected brevity-constrained output passed schema and no-quotation validation; internal-only diagnostic result produced**

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
| correlationId | `INT-PUB-005-ATTEMPT-4-20260618` |

---

## Governance Preconditions

| Requirement | Result |
|---|---|
| PR #81 merged first | passed - Attempt 3 evidence record merged |
| PR #82 merged after PR #81 | passed - output brevity constraints merged |
| PR #82 deployed before attempt | passed - Azure Function republished with remote build |
| Gate before authorized call | closed (`JM1_AI_EXECUTION_ENABLED=false`) |
| Fourth attempt authorization | limited to this diagnostic ID, intake reference, and manuscript only |

The deployment was corrected with remote build after an initial publish did not surface the JavaScript v4 function. The final deployment synced the `run-stage0-diagnostic` trigger before the authorized call.

---

## Gate State

| Event | State |
|---|---|
| Gate before actual authorized call | closed (`JM1_AI_EXECUTION_ENABLED=false`) |
| Gate during call | open for the single authorized request |
| Gate after call | closed (`JM1_AI_EXECUTION_ENABLED=false`) |

Gate was opened only for the authorized request and closed immediately afterward. No Flow D production wiring was enabled.

---

## Preflight Note

One preliminary HTTP request returned `401 UNAUTHORIZED` because the runner key header was populated from the Key Vault reference literal instead of the resolved secret value.

That request did not pass the runner-key guard. It did not read Dataverse, access the manuscript asset, call the model, validate output, or write metadata. The gate was closed immediately afterward before the corrected key-resolution path was used.

---

## Stage Results

| Stage | Result |
|---|---|
| HTTP response | `202 Accepted` |
| Runner gate | permitted |
| Dataverse record read | passed |
| Legacy exclusion gate | passed (`excluded=false`) |
| knowledge.md grounding | passed (`reachable=true`, `hashMatched=true`, `byteLength=35754`) |
| Manuscript asset gate (`jm1_manuscriptapprovedfordiagnostic`) | passed |
| Manuscript asset status | `null` |
| Manuscript filename | `240711 Establishing Glory.docx` |
| File type | `.docx` |
| Graph-authenticated manuscript read | passed |
| DOCX extraction | passed |
| Anthropic model call | passed (`httpStatus=200`) |
| Tool output schema validation | passed - no schema errors returned |
| No-quotation / output validation | passed (`valid=true`, 0 violations) |
| Confidence routing | Needs Human Review |
| Metadata-safe writes | passed |

---

## Manuscript Read Evidence

| Metric | Value |
|---|---|
| Byte length | 143,501 |
| Word count | 48,232 |
| SHA-256 | `b337a17a27c0c7108302ca7f671c26d788ce289fc3b9ffab6b12e09e23e87e31` |
| Content returned in response | `false` |

No manuscript content is included in this record.

---

## Token Usage

| Metric | Value |
|---|---|
| Input tokens | 74,886 |
| Output tokens | 223 |
| Total tokens | 75,109 |

---

## Output Validation

| Field | Result |
|---|---|
| `jm1_diagnosticoutputsummary` | passed no-quotation validation |
| `jm1_diagnosticriskflags` | passed no-quotation validation |

Safe output metadata:

| Metric | Value |
|---|---|
| Summary present | `true` |
| Summary length | 173 characters |
| Risk flags present | `true` |
| Risk flags length | 350 characters |
| Confidence | 0.79 |
| Requires human review | `true` |

The raw diagnostic output is not included in this record. It is internal-only and may contain characterization derived from the manuscript.

### Brevity Observation

Attempt 4 confirmed that PR #82's brevity constraints produced output that passed the unchanged 300-character prose-block validator. The risk-flags field was 350 characters overall, which indicates the 240-character schema guidance was not hard-enforced as a total field-length gate. Because no prose block exceeded the validator threshold, no quotation or output-validation violation was returned.

If a strict total-field-length requirement is desired for risk flags, that should be handled in a separate governed PR. The validator was not loosened for Attempt 4.

---

## Routing and Metadata Writes

| Item | Value |
|---|---|
| Diagnostic execution status | `835500004` |
| Status label | Needs Human Review |
| Requires human review | `true` |
| Routing basis | `CONFIDENCE_MID` |
| Low-confidence note | `null` |
| AI Request Log ID | `7bc36fcb-fb6a-f111-a826-6045bdd69738` |
| Execution Log ID | `930310ce-fb6a-f111-a826-000d3a14673b` |

Metadata writes used safe fields only. No raw prompt, manuscript content, raw model output, runner key, request headers, cookies, or tokens are included in this record.

---

## What Was Not Done

- No additional manuscript was processed
- No author-facing output was generated
- No author email was sent
- No Opportunity was created
- No Flow D production wiring was activated
- No unattended production diagnostic execution was enabled
- No raw model response was stored in this documentation
- No manuscript text was stored in this documentation
- No runner key, token, header, cookie, or connection string was exposed

---

## Authorization Status

This was the fourth authorized limited real-manuscript pilot call. The authorization covered this diagnostic ID, intake reference, and manuscript only.

The gate is closed after the call: `JM1_AI_EXECUTION_ENABLED=false`.

Any additional real-manuscript processing, author-facing use, Opportunity creation, author email, Flow D production activation, or unattended execution requires a separate explicit authorization.

---

## Result

Attempt 4 succeeded for its narrow purpose: it verified that the PR #82 output-brevity constraints can produce schema-valid output that passes the no-quotation/output validator on the selected real manuscript.

The diagnostic result remains internal-only and requires Jackie review before any further action.
