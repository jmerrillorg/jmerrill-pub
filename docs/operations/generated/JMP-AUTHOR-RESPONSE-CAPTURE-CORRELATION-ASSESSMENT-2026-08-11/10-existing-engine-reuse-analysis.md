# Existing Engine Reuse Analysis

Last verified: 2026-08-11T08:45:19Z

## Reusable Components

| Component | Reuse posture |
| --- | --- |
| `azure-functions/diagnostic-ai-runner/src/mail/publishingMailboxReader.js` | Reuse. It is read-only, mailbox-scoped, Inbox-only, and hardcoded to `publishing@jmerrill.one`. |
| `azure-functions/diagnostic-ai-runner/src/orchestration/authorReviewResponseConsumer.js` | Reuse with remediation. It already has discovery, idempotency, logging, and persistence paths, but needs canonical decision alignment and manual-recovery coverage. |
| `lib/server/author-decision-closeout-propagation.ts` | Reuse. It already carries the correct protected decision taxonomy and no-title-mutation boundary. |
| `scripts/author_decision_closeout_propagation.test.mjs` | Reuse / extend. It proves canonical decision behavior but currently exercises the protected propagation layer more than the live mailbox consumer. |

## Not Reusable As General Fix

| Component | Reason |
| --- | --- |
| `azure-functions/diagnostic-ai-runner/src/functions/runIntentionalLeaderAuthorResponse.js` | Title-specific commissioning processor for The Intentional Leader. It is not the general author response capture path. |

## Required Reuse Direction

The remediation should align the live mailbox consumer with the canonical protected propagation decision taxonomy instead of creating a parallel author-response system.

