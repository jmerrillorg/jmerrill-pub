# Existing Response Engine

Last verified: 2026-08-11T11:18:00Z

| Component | Exact component | Disposition |
| --- | --- | --- |
| Existing author-response engine | `azure-functions/diagnostic-ai-runner/src/orchestration/authorReviewResponseConsumer.js` | REUSED / EXTENDED |
| Existing inbound listener | `azure-functions/diagnostic-ai-runner/src/functions/runAuthorReviewResponseConsumer.js` | REUSED |
| Existing mailbox reader | `azure-functions/diagnostic-ai-runner/src/mail/publishingMailboxReader.js` | REUSED / EXTENDED |
| Existing decision classifier | `lib/server/author-decision-closeout-propagation.ts` and aligned live consumer classifier | REUSED / ALIGNED |
| Existing awaiting-state propagation | `lib/server/author-decision-closeout-propagation.ts` plus live gate patch for matching wait closure | REUSED / ALIGNED |
| Existing acknowledgement renderer | Canonical JMP HTML renderer from `lib/server/author-communication-brand.ts` | POLICY NOT YET GOVERNED FOR AUTO-ACK |

No second inbound-response architecture was created.

