# Process Fix Definition

Last verified: 2026-08-11T08:45:19Z

## Required Runtime Contract

The governed author-response path should perform this sequence for real author replies:

1. Read only the governed publishing mailbox.
2. Detect candidate replies against open author-review gates.
3. Claim the inbound message by immutable message identity.
4. Correlate author, title, stage, gate, package, and outbound review request.
5. Classify the response using the canonical decision taxonomy:
   - `APPROVED`
   - `APPROVED_WITH_CORRECTIONS`
   - `QUESTIONS`
   - `REVIEW_REQUIRED`
6. Persist decision date, source, and response summary.
7. Close awaiting-state evidence where the response is valid for the gate.
8. Emit execution-log events for every state.
9. Surface the next human action to the single-operator view.
10. Avoid title-state movement, author communication, marketing, financial, distribution, and Business Central side effects unless separately authorized.

## Specific Fix Required

Align `authorReviewResponseConsumer.js` with `author-decision-closeout-propagation.ts` so approval-plus-corrections replies are preserved as `APPROVED_WITH_CORRECTIONS`, not collapsed into plain correction handling or ambiguous review.

## Evidence Source

- Existing live consumer state machine: `azure-functions/diagnostic-ai-runner/src/orchestration/authorReviewResponseConsumer.js:16-24`
- Existing live consumer branches: `azure-functions/diagnostic-ai-runner/src/orchestration/authorReviewResponseConsumer.js:274-374`
- Canonical protected decision taxonomy: `lib/server/author-decision-closeout-propagation.ts:126-136`

