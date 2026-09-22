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
5. The gate-scanning consumer reads only the ten most recently modified open approval gates per run. For each gate it searches the most recent 25 Inbox messages using a stage-name subject probe. Its Developmental probe is `Developmental Review`; the observed Indomitable subject includes `Developmental Editorial Review`, and the Atta subjects identify `Untitled Edited Manuscript`. These do not satisfy that contiguous subject filter. The current readback does not prove whether either title's gate was among the ten scanned, but the source filter is independently capable of missing these genuine replies.

The classifier correction was merged in PR #829. The first deployment (run `35776414097`) failed closed because its package action did not change the pinned `WEBSITE_RUN_FROM_PACKAGE` blob; live health remained on the prior SHA and rollback succeeded. PR #830 corrected activation and rollback to use immutable blob URLs with the Function App's existing system-assigned managed identity and blob-read role. Production run `35777675219` passed with live release `c25a2de2540e3a1d1c3ab96e32f94745744d6184`.

A bounded September 22 system shadow replay selected all ten Inbox messages in the window. It ingested and classified all ten without failures; four had deterministic author/title correlation. The system classified Atta's installment request as `PAYMENT_CORRESPONDENCE` and the two Atta editorial messages plus Quanisha's reply as `AUTHOR_RESPONSE`. All four remain `REVIEW_REQUIRED`. A second replay without reprocessing returned ten idempotent results from ten selected messages. The inbound queue readback shows the four classifications and bindings persisted, but `lifecycleActionsAvailable=false`; no business-event persistence or downstream editorial/payment routing was proven. No manual business record, payment, author decision, stage transition, or communication was created by this packet.

## Required closure proof

The classifier deployment and idempotent Phase 1 replay are complete. Repair the gate consumer's bounded selection using durable inbound event identity and authoritative title/engagement/gate bindings, not subject text alone. Commission system-owned Phase 2 response processing with durable event binding and the current decision/payment gates. Close this packet only after fresh production readback proves response events, downstream routing, and authorized human dispositions where required. Atta remains charge-blocked; neither editorial response implies an approved exact-version manuscript without the governed human decision.
