# Live Boundary Evidence

Last verified: 2026-08-15

## Deployment

Deployment status: COMPLETE

Final release SHA:

`035d5c74d149720ab266ff7b063c200a309a5865`

Function App:

`func-jm1-diagnostic-ai-runner`

Deployment result:

- Remote build: SUCCESS
- Trigger sync: SUCCESS
- `run-editorial-execution-runtime-admin-replay`: present

## Production Configuration Readback

| Setting | Value |
| --- | --- |
| `JM1_PROMPT_MODEL_DEPLOYMENT_ALIAS` | `jm1-editorial-devline-primary` |
| `JM1_COPY_PROOF_MODEL_DEPLOYMENT_ALIAS` | `jm1-pub-diagnostic-primary` |
| `JM1_AI_EXECUTION_ENABLED` | `true` |

## Replay

Governed runtime replay status: PASS

Final replay:

```json
{
  "httpStatus": 200,
  "ok": true,
  "administrativeReplay": true,
  "processed": 1,
  "executorCount": 6,
  "correlationId": "EDITORIAL-RUNTIME-ADMIN-2026-08-15T03:11:26.826Z",
  "resultStatuses": [
    {
      "stageCode": "EDITORIAL_REVIEW",
      "status": "OUTPUT_ALREADY_RECORDED",
      "authorGate": {
        "ok": true,
        "idempotent": false,
        "gateId": "eeffc5fb-5698-f111-8076-000d3a14673b"
      }
    }
  ]
}
```

Idempotent replay:

```json
{
  "httpStatus": 200,
  "ok": true,
  "administrativeReplay": true,
  "processed": 0,
  "executorCount": 6,
  "correlationId": "EDITORIAL-RUNTIME-ADMIN-2026-08-15T03:11:45.160Z",
  "resultStatuses": []
}
```

## Production Fixes During Replay

Two production-only issues were found and corrected:

1. `jm1pub_gatecode` is a Dataverse choice field. Runtime now sends numeric A1-A5 values instead of string labels.
2. The Function App identity needed narrow create/append privileges for `jm1pub_editorialapprovalgate`.

Security role updated:

- Role: `JM1 Publishing Editorial Writeback - Core`
- Role ID: `53cf33ac-a07c-f111-ab0e-000d3a184b71`
- Added privileges:
  - `prvCreateJm1pub_Editorialapprovalgate`
  - `prvAppendJm1pub_Editorialapprovalgate`
 
Both role privilege additions returned HTTP 204.

## Boundary Preserved

- No retroactive author communication from this runtime.
- No production handoff triggered by author-gate creation.
- No stage advancement without author approval.
