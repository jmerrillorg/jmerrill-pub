# Live Executor Replay

Last verified: 2026-08-25T07:53:36Z

## Runtime Health

| Field | Value |
| --- | --- |
| Route | `https://func-jm1-diagnostic-ai-runner.azurewebsites.net/api/health` |
| Status | ready |
| Release | `785ea71c8ca59385d242da3eef382370d1ec86c3` |
| Production release | `785ea71c8ca59385d242da3eef382370d1ec86c3` |
| Node | `v22.23.2` |

## Replay Payload Scope

The replay supplied only recovered governed inputs:

- task ID
- title ID
- title
- author
- trim size
- corrected 275 page count
- imprint
- front-cover concept asset/checksum
- interior proof asset/checksum

No paper stock, ISBN, barcode, distribution path, or back-cover copy was fabricated.

## Replay Result

| Field | Value |
| --- | --- |
| HTTP status | 422 |
| Code | `FULL_WRAP_EXECUTION_BLOCKED` |
| Reason | `REQUIRED_INPUT_DATA_MISSING` |
| Missing | `PAPER_STOCK`, `ISBN`, `BARCODE`, `DISTRIBUTION_PATH`, `BACK_COVER_COPY` |
| Invalid | none |
| Execution log | `b9d949b5-2ea0-f111-b8db-7c1e525801f6` |
| Idempotent replay | true |
| Created execution log | false |
| Generated Full Wrap artifact | false |
| Advanced lifecycle | false |
| Sent author communication | false |
| Submitted distribution | false |

## Evidence

- `raw/function-health.json`
- `raw/fullwrap-executor-reduced-blocker-response.json`

