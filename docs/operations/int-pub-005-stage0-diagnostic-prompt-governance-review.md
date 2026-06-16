# INT-PUB-005 Stage 0 Diagnostic Prompt — Governance Review

## Purpose

This document presents the drafted Stage 0 Diagnostic prompt body for Jackie's governance review before activation. The prompt is currently stored in the Dataverse `jm1pub_aiprompttemplates` table as an **inactive** record (`jm1pub_active = false`). It will not be used by the runner until Jackie explicitly approves activation and all remaining Section 15 checklist items are satisfied.

No real AI call has been made. No manuscript has been read. The runner remains `CONTRACT_TEST_MODE=true`.

## Dataverse Record

| Field | Value |
|---|---|
| Record ID | `ef8acd4f-6869-f111-a826-000d3a14673b` |
| `jm1pub_promptkey` | `jm1-prompt-pub-stage0-diagnostic` |
| `jm1pub_promptname` | `Stage 0 Editorial Diagnostic` |
| `jm1pub_promptversion` | `PUB-STAGE0-DIAGNOSTIC-V1` |
| `jm1pub_modeldeploymentalias` | `jm1-pub-diagnostic-primary` |
| `jm1pub_groundingdependencies` | `knowledge.md` |
| `jm1pub_jsonschemaversion` | `v1.0.0` |
| `jm1pub_active` | `false` — inactive, pending Jackie approval |
| `jm1pub_effectivedate` | Not set — set only at activation |

## System Prompt

```
You are a Stage 0 Editorial Diagnostic Agent for JM1 Publishing. Your role is to perform an initial manuscript assessment to assist the editorial team in determining whether a submitted manuscript warrants advancement to Stage 1 editorial review.

You have access to the JM1 Publishing knowledge base (knowledge.md), which contains:
- Imprint definitions and editorial standards
- Package and scoring weights
- Stage 0 diagnostic rubric
- Publishing intake interpretation rules

CRITICAL RULES — YOU MUST FOLLOW THESE WITHOUT EXCEPTION:

1. NO-QUOTATION RULE: Your output must characterize the manuscript only. Never quote, reproduce, or echo manuscript text. Do not include verbatim sentences, phrases, or passages from the manuscript in any output field. Describe what you observe — do not show it.

2. HUMAN REVIEW REQUIRED: All Stage 0 assessments are advisory only. No author-facing action results from this assessment. Always set requiresHumanReview to true.

3. CHARACTERIZATION ONLY: Describe genre, themes, style, and quality signals in your own words. Risk flags must name the category of concern only — never quote the passage that triggered the flag.

4. STRUCTURED OUTPUT: Return a valid JSON object matching the specified schema exactly. Do not include markdown formatting, code fences, or any text outside the JSON object.

5. CONFIDENCE SCORING: Apply the JM1 Publishing Stage 0 confidence rubric from the knowledge base to assign a score between 0.0 and 1.0. This score reflects your assessment of how well the manuscript meets Stage 0 advancement criteria — not your confidence in the quality of your own analysis.

You are an internal editorial tool only. You have no author-facing role and no authority to make commitments of any kind on behalf of JM1 Publishing.
```

## User Prompt Template

Template variables resolved at runtime by the Azure Function from the diagnostic record and extracted manuscript content. No manuscript text is committed here.

```
Perform a Stage 0 Editorial Diagnostic assessment for the following manuscript submission.

INTAKE REFERENCE: {{intake_reference_code}}
WORK TYPE: {{work_type}}
GENRE (self-reported by author): {{genre}}
PROJECT TITLE (if provided): {{project_title}}

MANUSCRIPT:
{{manuscript_text}}

Apply the JM1 Publishing Stage 0 diagnostic rubric from your knowledge base. Return a JSON object with the following structure:

{
  "summary": "<characterization of the manuscript — no quotation, 500 characters maximum>",
  "recommendation": "<one of: Advance to Stage 1 | Hold for Editorial Review | Do Not Advance>",
  "confidence": <decimal 0.0 through 1.0>,
  "requiresHumanReview": true,
  "riskFlags": ["<category of concern — name the type, do not quote the manuscript>"],
  "structuredOutput": {
    "workTypeMatch": "<Aligned | Misaligned | Unclear>",
    "genreClassification": "<classified genre>",
    "marketabilitySignal": "<Strong | Moderate | Weak | Unclear>",
    "editorialReadiness": "<Ready | Needs Development | Significantly Underdeveloped>",
    "suggestedPackageCategory": "<package category from knowledge base, or null if undetermined>"
  }
}

Do not include any manuscript text, verbatim passages, or author-submitted prose in your response.
```

### Template variable binding

| Variable | Source | Notes |
|---|---|---|
| `{{intake_reference_code}}` | `jm1_intakereferencecode` on Publishing Intake | e.g. `JMP-INT-000001-ABC` |
| `{{work_type}}` | `jm1_worktype` on Publishing Intake | e.g. Fiction, Non-Fiction |
| `{{genre}}` | `jm1_genre` on Publishing Intake | Author self-reported |
| `{{project_title}}` | `jm1_projecttitle` on Publishing Intake | May be null |
| `{{manuscript_text}}` | Transient extraction from approved manuscript file (DOCX or TXT only) | Not persisted |

## Response JSON Schema (`v1.0.0`)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["summary", "recommendation", "confidence", "requiresHumanReview", "riskFlags", "structuredOutput"],
  "properties": {
    "summary": {
      "type": "string",
      "maxLength": 500,
      "description": "Characterization of the manuscript. No verbatim quotation permitted."
    },
    "recommendation": {
      "type": "string",
      "enum": ["Advance to Stage 1", "Hold for Editorial Review", "Do Not Advance"]
    },
    "confidence": {
      "type": "number",
      "minimum": 0.0,
      "maximum": 1.0
    },
    "requiresHumanReview": {
      "type": "boolean",
      "const": true
    },
    "riskFlags": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Category names only. No manuscript excerpts."
    },
    "structuredOutput": {
      "type": "object",
      "required": ["workTypeMatch", "genreClassification", "marketabilitySignal", "editorialReadiness"],
      "properties": {
        "workTypeMatch": {
          "type": "string",
          "enum": ["Aligned", "Misaligned", "Unclear"]
        },
        "genreClassification": { "type": "string" },
        "marketabilitySignal": {
          "type": "string",
          "enum": ["Strong", "Moderate", "Weak", "Unclear"]
        },
        "editorialReadiness": {
          "type": "string",
          "enum": ["Ready", "Needs Development", "Significantly Underdeveloped"]
        },
        "suggestedPackageCategory": {
          "type": ["string", "null"]
        }
      }
    }
  }
}
```

## Governance Compliance Checklist

| Item | Status |
|---|---|
| No manuscript text in prompt body | Confirmed — `{{manuscript_text}}` is a runtime variable, not committed here |
| No secrets, keys, or tokens in prompt body | Confirmed |
| No author PII in prompt body | Confirmed |
| No-quotation rule stated in system prompt | Confirmed — Rule 1, Rule 3 |
| Human review always required | Confirmed — Rule 2; `requiresHumanReview: true` hardcoded in schema |
| Grounding dependency declared | Confirmed — `knowledge.md` in `jm1pub_groundingdependencies` |
| Record is inactive | Confirmed — `jm1pub_active = false` |
| Prompt version logged | Confirmed — `PUB-STAGE0-DIAGNOSTIC-V1` in `jm1pub_promptversion` |
| Confidence scoring uses rubric from knowledge base | Confirmed — Rule 5 directs agent to apply knowledge base rubric |
| `knowledge.md` grounding file in governed location | **Not yet verified** — prerequisite before activation |

## Open Items Before Activation

The following must be resolved before `jm1pub_active` may be set to `true` and the runner may use this prompt:

1. **Jackie approves this prompt body** — this document is the review artifact.
2. **`knowledge.md` confirmed in governed location** accessible to the AI runtime.
3. **All remaining Section 15 items** in the ADR satisfied (DOCX/TXT extraction, Legacy-exclusion gate, no-quotation validation, log writes, confidence routing, controlled synthetic test).

## Non-Authorization Statement

This document presents the drafted prompt for review. It does not authorize AI execution. The runner remains `CONTRACT_TEST_MODE=true`. No real AI call will be made until Jackie explicitly approves this prompt and all Section 15 items are complete.

## Related Documents

- [`docs/operations/int-pub-005-stage0-diagnostic-ai-activation-decision-record.md`](./int-pub-005-stage0-diagnostic-ai-activation-decision-record.md)
- [`docs/operations/int-pub-005-stage0-diagnostic-ai-execution-contract.md`](./int-pub-005-stage0-diagnostic-ai-execution-contract.md)
- [`docs/operations/int-pub-005-stage0-diagnostic-ai-runner-azure-function.md`](./int-pub-005-stage0-diagnostic-ai-runner-azure-function.md)
