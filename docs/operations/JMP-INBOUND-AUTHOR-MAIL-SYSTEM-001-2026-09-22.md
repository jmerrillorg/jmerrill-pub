# Inbound Author Mail System Readback (2026-09-22)

Packet: `JMP-INBOUND-AUTHOR-MAIL-SYSTEM-001`

## Production evidence

- Function App: `func-jm1-diagnostic-ai-runner`, release `10003219ebe20a2dc741d06fa497abdf86ae6a07`.
- Phase 1 mode: `PRODUCTION_MONITORING`; delta reconciliation enabled; evidence store: blob.
- The Function App exposes the inbound notification, delta, health, queue, shadow-run, subscription, and asset-placement endpoints. It does not expose a Phase 2 author-response endpoint. The `A2_PRODUCTION_ACTIVE` app setting does not establish a deployed processor.
- At readback, inbound health reported 2,499 review items, zero failed messages, zero author decisions, and zero title lifecycle transitions. The last delta reconciliation was `2026-09-22T19:35:00.164Z`.
- A separate `run-author-review-response-consumer` function is deployed and runs every five minutes. Its Application Insights traces from `18:50Z` through `19:45Z` repeatedly reported `processed=0; idempotent=0; checked=10`. The Phase 1 counters alone do not cover that worker, but the worker's own traces show no processing during this interval.
- The queue readback contained ten messages received on September 22 UTC, four of which were correlated author replies. The other six were not author responses and did not have an author/title binding.

| Message received (UTC) | Subject | Phase 1 classification | System correlation | Durable state |
| --- | --- | --- | --- | --- |
| 18:11:14 | Approval with Corrections - Untitled Edited Manuscript | `AUTHOR_APPROVAL` | Atta / Untitled / `JMP-INT-202607-422JSZ` | `REVIEW_REQUIRED` |
| 18:14:05 | Request for 2nd and 3rd Installment Payment Plan | `AUTHOR_QUESTION` | Atta / Untitled / `JMP-INT-202607-422JSZ` | `REVIEW_REQUIRED` |
| 18:19:52 | Approval with Corrections - Untitled Edited Manuscript | `AUTHOR_APPROVAL` | Atta / Untitled / `JMP-INT-202607-422JSZ` | `REVIEW_REQUIRED` |
| 19:02:58 | Re: Indomitable - Developmental Editorial Review Ready for Your Review | `AUTHOR_APPROVAL` | Quanisha / Indomitable / `JMP-INT-202608-0AOS7L` | `REVIEW_REQUIRED` |

The two Atta editorial rows are distinct inbound message events. Their identical subjects alone do not establish duplication or a single decision. Phase 1 evidence does not prove an exact artifact-version decision, a payment-plan election, or a lifecycle transition.

## Producer defects and correction

1. Phase 1 classified mixed approval/correction language as plain approval. The corrected classifier emits `AUTHOR_RESPONSE` with human review required.
2. Phase 1 classified an installment payment request as a general author question. The corrected classifier emits `PAYMENT_CORRESPONDENCE` with human review required.
3. Unrelated messages with a question mark entered the author-question queue. The corrected author-question rule requires a deterministically identified author contact.
4. The currently deployed Phase 2 setting has no corresponding deployed Phase 2 author-response function. A separate gate-scanning author-review consumer is deployed, but its current runs processed zero replies. Consequently, current production evidence does not show system-owned response-event persistence, editorial/payment routing, or governed human-review disposition for these messages. This is a separate open producer defect; Phase 1 queue presence must not be reported as full processing.

The classifier correction is source-level until merged, deployed, and the affected messages are replayed through the governed system. No manual business record, payment, author decision, stage transition, or communication was created by this packet.

## Required closure proof

Deploy the classifier correction through the Publishing Function App workflow, then reprocess the exact affected message events through the system and verify idempotent queue state. Commission a system-owned Phase 2 response processor with durable event binding and the current decision/payment gates. Close this packet only after fresh production readback proves response events, downstream routing, and authorized human dispositions where required. Atta remains charge-blocked; neither editorial response implies an approved exact-version manuscript without the governed human decision.
