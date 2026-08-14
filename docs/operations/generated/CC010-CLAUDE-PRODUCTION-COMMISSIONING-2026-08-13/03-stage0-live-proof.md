# 03 - Stage 0 Live Proof

Last verified: 2026-08-14T01:20:30Z

## Live Transaction

| Field | Value |
| --- | --- |
| Execution | Quanishia Stage 0 live transaction |
| Diagnostic ID | `572a89ef-cd95-f111-8076-7c1e525b15c2` |
| Intake reference | `JMP-INT-202608-0AOS7L` |
| Correlation ID | `QUANISHIA-STAGE0-CLAUDE-COMMISSIONING-4096-20260813` |
| Result | `accepted` |
| Provider | `microsoft-foundry-claude` |
| Fallback | `false` |
| HTTP status | `200` |
| Metadata writes | `aiRequestLog.created=true`; `executionLog.created=true` |
| Author-facing action | 0 |
| Opportunity created | 0 |

## Asset Gate

```json
{
  "approvedForDiagnostic": true,
  "assetStatus": "3",
  "filename": "Indomitable_Compiled_Batch1_2.docx",
  "fileTypeHint": ".docx"
}
```

## Manuscript Read

```json
{
  "ok": true,
  "fileType": ".docx",
  "byteLength": 44426,
  "wordCount": 13709,
  "sha256": "a07ebc379780e168e353577d70d2852abb60bdeb0463b28d9f6301bb43bfcb66",
  "contentReturned": false
}
```

## Model Call

```json
{
  "ok": true,
  "provider": "microsoft-foundry-claude",
  "httpStatus": 200,
  "tokens": {
    "input": 37355,
    "output": 2704,
    "total": 40059
  }
}
```

## Output Validation

```json
{
  "valid": true,
  "violations": [],
  "fieldsChecked": [
    "jm1_diagnosticoutputsummary",
    "jm1_diagnosticriskflags"
  ]
}
```

## Confidence Routing

```json
{
  "status": 835500004,
  "statusLabel": "Needs Human Review",
  "requiresHumanReview": true,
  "lowConfidenceNote": null,
  "routingBasis": "CONFIDENCE_MID"
}
```

## Metadata Writes

```json
{
  "aiRequestLog": {
    "created": true,
    "id": "5eddbe65-7e97-f111-8075-70a8a5914a07"
  },
  "executionLog": {
    "created": true,
    "id": "5dddbe65-7e97-f111-8075-70a8a5914a07"
  }
}
```

## Safe Internal Diagnostic Output

```json
{
  "jm1_diagnosticoutputsummary": "Faith memoir/testimony; strong voice, moderate structural gaps (Ch.11 incomplete, unplaced fragment); J Merrill Publishing fit likely.",
  "jm1_diagnosticriskflags": "ethicsFlag; legalFlag; defamationRiskFlag; rightsConcernFlag; thirdPartyContentDetected; scriptureUseReview",
  "jm1_confidence": 0.78,
  "jm1_requireshumanreview": true
}
```

## Boundary Message

```text
Real manuscript pilot diagnostic complete. Output is for Jackie internal review only. No author-facing action taken. No Opportunity created. No email sent.
```

