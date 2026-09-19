# Quanishia Stage 0 Retry History

Last verified: 2026-08-14T00:00:00Z

## Live Asset

| Field | Value |
|---|---|
| Author | Quanishia Dockery |
| Intake | `JMP-INT-202608-0AOS7L` |
| Diagnostic record | `572a89ef-cd95-f111-8076-7c1e525b15c2` |
| Governed manuscript | `Indomitable_Compiled_Batch1_2.docx` |
| Source issue | RESOLVED |
| False Jackie gate | CLEARED |

## Proven Pre-Model Stages

The current live path has already proven:

- Source retrieval: PASS
- Dataverse read: PASS
- Graph manuscript read: PASS
- DOCX extraction: PASS
- Prompt template retrieval: PASS
- Prompt build: PASS
- Azure model invocation reached: PASS
- Former HTTP 400 not reproduced: PASS

## Governed Retry Attempts

| Attempt | Correlation ID | HTTP | Result | Waiting on | Jackie action | Next retry |
|---:|---|---:|---|---|---|---|
| 0 | `QUANISHIA-STAGE0-AZURE400-ROOTCAUSE-FIX-20260813` | 202 | `MODEL_CAPACITY_RETRY_SCHEDULED` | System | NO | `2026-08-13T18:10:45.083Z` |
| 1 | `QUANISHIA-STAGE0-AZURE400-ROOTCAUSE-FIX-RETRY1-20260813` | 202 | `MODEL_CAPACITY_RETRY_SCHEDULED` | System | NO | `2026-08-13T18:42:18.611Z` |
| 2 | `QUANISHIA-STAGE0-CC010-WAVE1-RETRY2-20260813` | 202 | `MODEL_CAPACITY_RETRY_SCHEDULED` | System | NO | `2026-08-14T00:59:58.807Z` |

## Current Production Response

```json
{
  "status": "retry-scheduled",
  "code": "MODEL_CAPACITY_RETRY_SCHEDULED",
  "failedStage": "modelCall",
  "waitingOn": "System",
  "notificationRequired": false,
  "operatingCenter": {
    "jackieActionRequired": false,
    "status": "EDITORIAL_REVIEW_PROCESSING",
    "substatus": "RETRY_SCHEDULED",
    "waitingOn": "System"
  },
  "retry": {
    "retryCount": 3,
    "delayMinutes": 60,
    "maxRetries": 5,
    "nextAttemptAt": "2026-08-14T00:59:58.807Z",
    "reason": "TRANSIENT_MODEL_CAPACITY"
  }
}
```

## Interpretation

The current condition is `EXTERNAL_CAPACITY_WAIT`, not an architecture failure, Jackie action, author dependency, or manual processing requirement.

