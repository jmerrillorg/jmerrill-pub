# First Failure Analysis

Last verified: 2026-08-11T08:45:19Z

## First Failing Layer

`AUTHOR_RESPONSE_CAPTURE_CORRELATION`

The inbound message exists in the governed publishing mailbox and can be correlated to the author, title, stage, gate, and package. The first missing durable step is that no capture/correlation/persistence evidence was found for the exact inbound message ID or received timestamp.

## Secondary Runtime Drift

The deployed mailbox consumer and the protected propagation engine do not use the same decision vocabulary:

| Component | Behavior |
| --- | --- |
| Mailbox consumer | Classifies approval, correction request, question, acknowledgment, or ambiguous responses |
| Protected propagation engine | Classifies `APPROVED`, `APPROVED_WITH_CORRECTIONS`, `QUESTIONS`, or `REVIEW_REQUIRED` |

For this response, the correct business classification is `APPROVED_WITH_CORRECTIONS`. The mailbox consumer has no durable `APPROVED_WITH_CORRECTIONS` outcome. If it processes the text as written, its correction keyword branch can route the message to correction-request handling rather than preserving the mixed approval-plus-corrections decision.

## Evidence Source

- Consumer classifier: `azure-functions/diagnostic-ai-runner/src/orchestration/authorReviewResponseConsumer.js:126-133`
- Consumer approval branch: `azure-functions/diagnostic-ai-runner/src/orchestration/authorReviewResponseConsumer.js:274-309`
- Consumer correction branch: `azure-functions/diagnostic-ai-runner/src/orchestration/authorReviewResponseConsumer.js:311-345`
- Protected classifier: `lib/server/author-decision-closeout-propagation.ts:126-136`
- Protected propagation treats `APPROVED_WITH_CORRECTIONS` as a captured decision without automatic protected closeout: `lib/server/author-decision-closeout-propagation.ts:207-230`

