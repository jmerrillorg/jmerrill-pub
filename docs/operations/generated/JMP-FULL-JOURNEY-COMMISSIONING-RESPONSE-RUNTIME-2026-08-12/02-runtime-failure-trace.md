# Runtime Failure Trace

Last verified: 2026-08-12

## Production Trigger Model

Author-review response consumer trigger: Azure Functions timer

Schedule: `0 */5 * * * *`

Target mailbox: `publishing@jmerrill.one`

Runtime identity: `func-jm1-diagnostic-ai-runner`

Operational target: routine author response recognized within 5 minutes under normal conditions.

## Expected Path

Mailbox receives message

Discovery

Eligibility

Correlation

Classification

Durable capture

Awaiting-response state resolution

Downstream continuation

## Observed Production State Before Remediation

Dataverse execution-log readback for diagnostic `48cd0d86-f595-f111-8076-6045bdd69435` showed:

| Time | Event | Meaning |
| --- | --- | --- |
| 2026-08-12T02:55:16Z | PRE_PACKAGE_EDITORIAL_REVIEW_PERFORMED | Stage 0 recommended Starter and J Merrill Publishing. |
| 2026-08-12T03:00:19Z | AUTHOR_RECOMMENDATION_SUPERSEDED | Previous recommendation supersession evidence. |
| 2026-08-12T03:00:21Z | AUTHOR_RESPONSE_SENT | Editorial Recommendation Letter sent; workflow awaiting author response. |
| 2026-08-12T03:00:21Z | EDITORIAL_RECOMMENDATION_LETTER_REPLACEMENT_SENT | Replacement send evidence; workflow remains Awaiting Author Response. |

No `AUTHOR_RESPONSE_CAPTURED`, `PACKAGE_SELECTED`, or `AUTHOR_PACKAGE_SELECTION_MESSAGE_COMPLETED` event existed for the 2026-08-12T10:35Z mailbox response at the time of readback.

## First Failed Or Missing Transition

Discovery / eligibility.

The deployed shared inbound consumer only scanned open `jm1pub_editorialapprovalgate` records. The Stage 0 recommendation package-selection request is not an editorial approval gate, so the five-minute consumer did not evaluate it.

Second contributing cause: the mailbox reader's default safety rule excluded internal publishing senders. The actual package-selection mailto response was self-addressed from `publishing@jmerrill.one` to `publishing@jmerrill.one`.

## Root Cause

The runtime had a governed author-review response consumer, but Stage 0 package-selection replies were outside its watched population. A title-specific legacy function existed for an older controlled record, but the current full-journey title needed the reusable inbound runtime to consume Stage 0 package selections.

## Correct Remediation Boundary

Do not manually enter Starter.

Do not create a Jackie decision.

Do not send a clarification request.

Process the actual mailbox message after the patched runtime is deployed.
