# JM1-COMMS-002A Current Path Inventory

## Scope

This inventory covers only the `PAYMENT_ELECTION_REQUIRED` outbound communication effect. It does not alter payment-option classification, payment schedules, invoices, Stripe, royalties, distribution, or other communication classes.

## Before Adoption

| Authority | Current path at the start of JM1-COMMS-002A |
| --- | --- |
| Event source | `processPublishingAgreementExecuted` reconciles the current executed agreement in `lib/server/publishing/agreement-execution-reconciliation.ts`. |
| Action-request creation | The V2 business rule existed in `paymentElectionActionRequest.js`, but the production agreement reconciliation did not persist the resulting action request. Whole used a bound manual-continuity record. |
| Email generation | Manual continuity composed the author message. The certified shared template existed but was not bound to the lifecycle effect. |
| Send path | Human/operator continuity send from Publishing. No active automatic send path existed for this event class. |
| From | Manual Publishing mailbox authority. |
| CC | Operator-managed visibility; not guaranteed by the lifecycle caller. |
| Reply-To | Publishing mailbox through the manual path. |
| Traceability | Payment-election action/evidence logs and mailbox evidence; no automatic JM1 MessageId/provider MessageId binding for the lifecycle effect. |
| Manual steps | Draft/format message, select sender, remember CC and Reply-To, send, and bind evidence. |
| Duplicate guards | One-open-action-request rule and manual Whole evidence; no single automatic transport idempotency boundary because the automatic effect was not active. |

## Adopted Path

The current executed-agreement reconciliation persists one marked, current-only action request when no valid payment election exists. The diagnostic runner revalidates agreement, opportunity, election, recipient, package amount, and payment policy immediately before invoking `PUBLISHING.PAYMENT_ELECTION_REQUIRED@1.0.0` through the enterprise ACS relay.

The relay derives the canonical Publishing system sender, mandatory `publishing@jmerrill.one` CC, and Publishing Reply-To. Durable relay idempotency binds the action request and template version to one JM1 MessageId. Dataverse execution logs bind pending, ACS acceptance, failure, cancellation, manual fulfillment, and waiting-on-author states.

Historical records are excluded because the consumer scans only records carrying `communicationAuthority=JM1_COMMS_002A`. Whole has a completed Full Pay election and is also rejected by immediate current-state revalidation.
