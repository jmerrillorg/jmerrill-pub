# Known Runtime Gaps

Last Verified: 2026-08-25T07:37:00Z

## Foundry Capacity

| Field | Value |
| --- | --- |
| Resource | `ais-jm1-foundry` |
| Region | `eastus2` |
| Deployment | `jm1-editorial-devline-primary` |
| Model | `claude-sonnet-5` version `2` |
| Deployment type | `GlobalStandard` |
| Current capacity | 25 |
| Rate limit | 25 requests / 60 seconds |
| Token limit | 25,000 tokens / 60 seconds |
| General's Will result | `MICROSOFT_FOUNDRY_HTTP_429_RATE_LIMIT_OF_5000_PER_60S_EXCEEDED_FOR_USERBYMODELBYMINUTEOUTPUTTOKENS` |

Current Foundry capacity remains insufficient for the governed Line Editing execution attempt. General's Will is therefore externally capacity-blocked after a real execution attempt. Long Watch passed the same targeted dry-run contract but was not executed after the General's Will capacity failure.

## Full Wrap

| Field | Value |
| --- | --- |
| Route | `run-full-wrap-executor` |
| Feature flag | `JM1_FULL_WRAP_EXECUTOR_ENABLED=true` |
| Task | `Full Wrap Preparation - The Intentional Leader, Volume I` |
| Task ID | `6dd4bddc-07a0-f111-b8dc-000d3a14673b` |
| Execution result | BLOCKED |
| Blocker | REQUIRED_INPUT_DATA_MISSING |

Missing required inputs:

- `TITLE_ID`
- `TITLE`
- `AUTHOR`
- `TRIM_SIZE`
- `FINAL_PAGE_COUNT`
- `PAPER_STOCK`
- `ISBN`
- `BARCODE`
- `IMPRINT`
- `DISTRIBUTION_PATH`
- `BACK_COVER_COPY`
- `FRONT_COVER_ASSET`
- `INTERIOR_PROOF_ASSET`

The Full Wrap worker is not missing. It is live, gated, and fail-closed. The current blocker is missing production input authority and task/title binding, not a missing route.

