# Runtime And Queue Rechecks

Last Verified: 2026-08-27T00:07:06Z

## Production Health

| Surface | Result |
| --- | --- |
| `https://jmerrill.pub/api/health` | READY |
| `https://func-jm1-diagnostic-ai-runner.azurewebsites.net/api/health` | READY |
| Diagnostic Runner release observed | `073de67b772be59def6b446a7640084c26b8a0e5` in runner health evidence; public app health also ready |

## Foundry Deployment Evidence

| Field | Value |
| --- | --- |
| Deployment | `jm1-editorial-devline-primary` |
| Model | `claude-sonnet-5` |
| Model version | `2` |
| SKU | `GlobalStandard` |
| RPM | 25 requests / 60 seconds |
| TPM | 25,000 tokens / 60 seconds |

## Live Route Rechecks

| Title | Route | HTTP | Result | Interpretation |
| --- | --- | ---: | --- | --- |
| The General's Will and Last Testament | `run-targeted-editorial-execution` / EXECUTE | 422 | `AUTHOR_APPROVAL_NOT_EXACT_ARTIFACT_BOUND` | Correct fail-closed state. Current corrected artifact needs exact author approval before Line Edit. |
| The Long Watch | `run-targeted-editorial-execution` / EXECUTE | 422 | `TARGET_STAGE_ALREADY_COMPLETED_FOR_SOURCE` | Duplicate Line execution prevented. Existing output log: `13715bea-cda0-f111-b8dc-7c1e525b15c2`. |

## Full Wrap

| Field | Value |
| --- | --- |
| Executor | `run-full-wrap-executor` |
| Gate | `JM1_FULL_WRAP_EXECUTOR_ENABLED=true` |
| The Intentional Leader blocker | `BACK_COVER_COPY_APPROVAL_REQUIRED` |
| System blocker? | NO |

