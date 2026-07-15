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
| CAP-002 | Line Editing | Controlled Initialization Complete - External Author Developmental Exit Hold | The Intentional Leader, Volume I after Developmental exit | Jackie / Editorial | Hold | Developmental exit formally satisfied; then begin bounded line-editing proof from locked source package without author-facing movement |
| CAP-003 | Copyediting | Level 0 - future | The Intentional Leader, Volume I | Jackie / Editorial | Future | CAP-002 proof |
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
| CAP-002 Line Editing | The Intentional Leader, Volume I | CAP-002 locked source package, project style sheet, and 80-item intake queue | External author developmental exit / stage-completion boundary before substantive Line Editing | Developmental exit formally satisfied and bounded sample authorized | No sentence editing, Line Editing stage activation, or author action surfacing before exit gate exists | CAP-011 Author Marketing and Launch Operations |
