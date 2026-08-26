# Stripe Connect Readiness

Last Verified: 2026-08-26T14:39:18Z

Evidence Source: `node scripts/stripe_connect_author_pilot.mjs`; bounded Publishing mailbox read.

| Metric | Count / State |
| --- | --- |
| READY_FOR_STRIPE_CONNECT | 0 |
| EXISTING_CONNECT_READY | 41 |
| Human-review exceptions | 1 |
| Selected pilot authors in this pass | 0 |
| Accounts created in this pass | 0 |
| Onboarding links generated in this pass | 0 |
| Invitations sent in this pass | 0 |
| Failures in this pass | 0 |
| Payout system | BILL_COM_LEGACY |
| Royalty payouts | 0 |
| Stripe transfers | 0 |
| Bill.com disabled | false |

Bounded mailbox read found one active Stripe Connect support reply:

| Author | Evidence | State |
| --- | --- | --- |
| Devin Gilchrest | Reply to Stripe setup message received 2026-08-25T22:12:31Z | True human support gate; do not execute payout/payment action |

The live health sub-check used by the older pilot script reports `NOT_READY` because that script still compares production release to the PR #567 release rather than the current whole-system release. The source-readiness counts remain usable as current Dataverse/Connect evidence.

