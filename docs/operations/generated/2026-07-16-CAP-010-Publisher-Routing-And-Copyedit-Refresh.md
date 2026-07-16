# CAP-010 Operational Refresh

Generated: 2026-07-16T05:40:26.633Z

Source: JM1-Core Dataverse + local capability registry

## Core Readback

| Signal | Count |
|---|---:|
| Execution log rows read | 250 |
| Title rows read | 202 |
| Editorial stage rows read | 10 |
| Approval gate rows read | 4 |

## Capability Signals

| Capability | Core signal count |
|---|---:|
| CAP001 | 0 |
| CAP002 | 23 |
| CAP003 | 17 |
| CAP007 | 8 |
| CAP008 | 6 |
| CAP009 | 146 |
| CAP011 | 8 |

## Catalog Health

| Stage | Count |
|---|---:|
| Archive | 39 |
| Inquiry | 3 |
| Backlist/Published | 117 |
| (blank) | 34 |
| Production | 2 |
| Ongoing Relationship | 3 |
| Editorial | 4 |

## Author Actions

| Action | Count |
|---|---:|
| approvalReceived | 0 |
| notificationSent | 0 |
| packageDelivered | 0 |

## Governance Holds / Decision-Ready Capabilities

- CAP-003: Level 1 Proof - Full Volume I Copyediting internally complete; publisher release decision ready
- CAP-007: Level 1 Proof - non-posting royalty statement proof complete; opening-balance external evidence hold; BC foundation readback still bounded by finance/tooling evidence

## Publisher Routing and Copyediting Coverage

| Capability | Exit State | Current Evidence | Remaining Dependency |
|---|---|---|---|
| CAP-002 | Level 1 Proof - Author-approved Volume I Line Editing complete; Copyediting authorized and started | 23 Core signal(s); source package/style sheet/intake queue events included if inside read window | Reuse on next title after CAP-002 package release/approval path remains stable across a second proof asset |
| CAP-003 | Level 1 Proof - Full Volume I Copyediting internally complete; publisher release decision ready | 17 Core signal(s); Copyediting stage, correction ledger, QA, package-readiness, and publisher-routing proof events included if inside read window | Jackie release decision on the author-facing Copyediting package; after approval, release package through governed author communication without starting Proofreading |
| CAP-007 | Level 1 Proof - non-posting royalty statement proof complete; opening-balance external evidence hold; BC foundation readback still bounded by finance/tooling evidence | 8 Core signal(s); royalty statement proof event count 1 | External bank/QBO/Bill.com evidence, BC foundation readback completion, real governed royalty statement proof, Stripe/payout reconciliation proof |
| CAP-008 | Level 2 Candidate - password recovery/reset, fresh sign-in, logout, Core authorization, and project switching proven; explicit administrative session revocation remains hardening | 6 Core signal(s); password recovery/reset, fresh sign-in, logout, Core authorization, and project switching evidence recorded | Complete explicit session-revocation proof if required for Level 2 certification; old-password rejection was not independently tested by Cody because private password values were not handled |
| CAP-009 | Safe Write Executed - governed app-only credential restored; Establishing Glory: The Library stamped Editorial with Core readback | 146 catalog governance signal(s); blank titles 34; approved bibliographic safe-write execution event count 1; reconciliation event count 1 | Broader catalog lineage/alias/identifier writes remain future governed packages only; 34 blank-stage/unknown titles remain excluded until separately approved |
| CAP-010 | Operational Enterprise Command - Wave 2 Coverage Proven | This refresh generated machine-readable and human-readable publisher-routing and copyediting coverage | Promote operational refresh to governed dashboard surface and add scheduled/automated refresh |
| CAP-011 | Level 1 Controlled Proof Complete - production form, durable session, security rejection, Core execution logging, retry/idempotency, and project switching proven | 8 Core signal(s); production deployment, authenticated submission, Core execution logging, unauthenticated rejection, idempotency proof, and project-switching continuity proven | Invalid project-scoped URL stayed in loading state without exposing unauthorized data; retain as UX hardening, not a Level 1 blocker |

## Current Operational Views

- Proof assets tracked: The Intentional Leader Volume I; synthetic CAP-007 royalty proof; Lane A/B/C stage backfill; Author Operating Center marketing profile slice
- Dependency holds: 1
- Financial module state: Level 1 Proof - non-posting royalty statement proof complete; opening-balance external evidence hold; BC foundation readback still bounded by finance/tooling evidence
- Identity recovery state: Level 2 Candidate - password recovery/reset, fresh sign-in, logout, Core authorization, and project switching proven; explicit administrative session revocation remains hardening
- Catalog write state: Safe Write Executed - governed app-only credential restored; Establishing Glory: The Library stamped Editorial with Core readback
- Marketing proof state: Level 1 Controlled Proof Complete - production form, durable session, security rejection, Core execution logging, retry/idempotency, and project switching proven
- Stale-data warning: Refresh reads latest 250 execution-log rows plus live title/stage/gate rows; older events may be outside the read window.
- Refresh coverage: CAP maturity, proof assets, author actions, publisher actions, dependency holds, financial/catalog/identity/marketing states, execution failures, catalog stage counts.

## Recent Execution Failures

- 2026-07-15T06:03:23Z: CAP011_LEVEL1_CONTROLLED_PROOF_COMPLETE (729d40df-1280-f111-ab0f-00224820105b)
- 2026-07-15T00:57:47Z: CAP009_BIBLIOGRAPHIC_SAFE_WRITE_BLOCKED (d432642e-e87f-f111-ab0f-000d3a14673b)
