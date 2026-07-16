# JM1 Capability Maturity Registry

Generated: 2026-07-14

## Maturity Levels

| Level | Name | Meaning |
|---:|---|---|
| 0 | Concept | Capability is being designed and has not completed a live proof. |
| 1 | Proof | Capability completed a controlled demonstration on at least one proof asset but is not approved for reusable production use. |
| 2 | Provisionally Certified | Capability is reusable, evidence-backed, tested beyond one title-specific configuration, and approved for controlled production use with bounded hardening gaps. |
| 3 | Enterprise Certified | Capability is the default JM1 process, operationally hardened, deterministic where appropriate, and governed by normalized state, evidence, logging, recovery, and validation controls. |

## Registry

| CAP | Capability | Current Maturity / State | Proof Asset | Owner | Current Priority | Next Promotion Criterion |
|---|---|---|---|---|---|---|
| CAP-001 | Developmental Editing | Level 2 - Provisionally Certified / Controlled Production Active | The Intentional Leader, Volume I | Jackie / JM1 Publishing | Active proof asset | Level 3 candidate only after second controlled project, automated source-lock/package checks, and operational defect recovery proof |
| CAP-002 | Line Editing | Level 1 Proof - Author-approved Volume I Line Editing complete; Copyediting authorized and started | The Intentional Leader, Volume I | Jackie / Editorial | Complete for proof asset | Reuse on next title after CAP-002 package release/approval path remains stable across a second proof asset |
| CAP-003 | Copyediting | Level 1 Proof - Full Volume I Copyediting internally complete; publisher release decision ready | The Intentional Leader, Volume I | Jackie / Editorial | Active release decision | Jackie release decision on the author-facing Copyediting package; after approval, release package through governed author communication without starting Proofreading |
| CAP-004 | Proofreading | Level 0 - future | Typeset proof of The Intentional Leader | Jackie / Editorial | Future | CAP-003 proof |
| CAP-005 | Production and Prepress | Level 0 - future | The Intentional Leader | Jackie / Production | Future | Editorial completion and production package |
| CAP-006 | Distribution Operations | Level 0 - future | The Intentional Leader | Jackie / Distribution | Future | Production proof and metadata/distribution readiness |
| CAP-007 | Financial and Royalty Operations | Level 1 Proof - non-posting royalty statement proof complete; opening-balance external evidence hold; BC foundation readback still bounded by finance/tooling evidence | BC sandbox and synthetic royalty proof | Jackie / Finance | Primary | External bank/QBO/Bill.com evidence, BC foundation readback completion, real governed royalty statement proof, Stripe/payout reconciliation proof |
| CAP-008 | Author Identity and Experience | Level 2 Candidate - password recovery/reset, fresh sign-in, logout, Core authorization, and project switching proven; explicit administrative session revocation remains hardening | chosen2k7@gmail.com and controlled author validation | Jackie / Identity | Hardening | Complete explicit session-revocation proof if required for Level 2 certification; old-password rejection was not independently tested by Cody because private password values were not handled |
| CAP-009 | Bibliographic Identity and Catalog Governance | Safe Write Executed - governed app-only credential restored; Establishing Glory: The Library stamped Editorial with Core readback | Lane A/B/C stage backfill and Establishing Glory lineage | Jackie / Catalog | Controlled proof complete | Broader catalog lineage/alias/identifier writes remain future governed packages only; 34 blank-stage/unknown titles remain excluded until separately approved |
| CAP-010 | Enterprise Command | Operational Enterprise Command - Wave 2 Coverage Proven | JM1-Core, execution logs, registry, QA artifacts, and refresh outputs | Jackie / Enterprise Ops | Active | Promote operational refresh to governed dashboard surface and add scheduled/automated refresh |
| CAP-011 | Author Marketing and Launch Operations | Level 1 Controlled Proof Complete - production form, durable session, security rejection, Core execution logging, retry/idempotency, and project switching proven | Author Operating Center marketing profile | Jackie / Marketing | Controlled proof complete | Invalid project-scoped URL stayed in loading state without exposing unauthorized data; retain as UX hardening, not a Level 1 blocker |

## Governance Holds

| Capability | Proof Asset | Evidence Package | Pending Decision | Restart Conditions | Prohibited Actions | Next Active Capability |
|---|---|---|---|---|---|---|
| CAP-003 Copyediting | The Intentional Leader, Volume I | CAP-003 copyedited working manuscript, controlled sample, correction ledger, updated style sheet, internal QA, integrity manifest, and author-facing package draft | Jackie publisher release decision before author-facing Copyediting package is sent | Jackie approves, changes, or holds the Copyediting release package | No author-facing Copyediting release, Proofreading start, or author action surfacing before Jackie release approval | CAP-003 author release / then CAP-004 Proofreading readiness |
