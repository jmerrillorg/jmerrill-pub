# Dispatch Execution Evidence

Last verified: 2026-09-02T21:56:11Z

## Invocation

Operation: `PublishingDispatchService.dispatchAuthorPackage`

| Field | Value |
| --- | --- |
| Execution mode | `DRY_RUN` |
| Package ID | `pkg-gate-w1-synthetic-recommendation-20260729-author-review-v1` |
| Package version | `v1.0` |
| Title ID | `48e831f0-418b-f111-ab10-000d3a1a9efa` |
| Stage ID | `a086e9f2-418b-f111-ab10-6045bdd69738` |
| Recipient Contact ID | `8b2a87d4-418b-f111-ab10-000d3a1a9efa` |
| Recipient email | `jm1.gate.w1.synthetic.long+20260729@jmerrill.one` |
| Gate ID | `a74b0513-4c8b-f111-ab10-6045bdd69738` |

## Dispatch Result

| Check | Result |
| --- | --- |
| `DISPATCH_PAYLOAD_VALID` | `PARTIAL` |
| `CANONICAL_RECIPIENT_BOUND` | `PASS` |
| `IDEMPOTENCY_KEY_CREATED` | `PASS` |
| `OUTBOUND_PROVIDER_REQUEST_CREATED` | `NO` |
| `EXECUTION_LOG_CREATED` | `NO` |
| Runtime status | `blocked` |

## Idempotency Key

`author-package-notification:48e831f0-418b-f111-ab10-000d3a1a9efa:EDITORIAL_REVIEW:recipient:8b2a87d4-418b-f111-ab10-000d3a1a9efa:pkg-gate-w1-synthetic-recommendation-20260729-author-review-v1:v1.0:c6718c1a81ac58c863996c91909b8b88457532b80dd4bdf31c306d826f156fb7`

## Blockers

- `PUBLISHING_DISPATCH_BLOCKED - QA`
- `PUBLISHING_DISPATCH_BLOCKED - REQUIREDATTACHMENTS`
- `PROSPECT_EDITORIAL_REVIEW_REQUIRES_PROSPECT_PACKAGE_SELECTION_PATH`
