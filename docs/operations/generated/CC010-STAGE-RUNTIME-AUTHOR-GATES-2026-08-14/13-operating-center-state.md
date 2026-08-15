# Operating Center State

Last verified: 2026-08-14

## State Exposure

The runtime writes stage summaries that distinguish package preparation from author release and next-stage authorization.

## Operational Meaning

The Operator/Publisher view should treat open author-review gates as review-wait states, not as completed author approvals or production authorization.

Evidence source:

- `azure-functions/diagnostic-ai-runner/src/editorial/editorialExecutionRuntime.js`
