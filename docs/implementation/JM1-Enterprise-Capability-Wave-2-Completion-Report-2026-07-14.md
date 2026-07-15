# JM1 Enterprise Capability Wave 2 Completion Report

Generated: 2026-07-14

## Executive Result

Wave 2 is closed as an enterprise capability wave.

Closure event: `ENTERPRISE_CAPABILITY_WAVE2_CLOSED`

Closure execution-log ID: `c883ecb5-1580-f111-ab0f-000d3a14673b`

Closure timestamp: `2026-07-15T06:23:37Z`

The sprint produced governed movement across the Wave 2 capability set: CAP-002 was initialized from a locked source package, CAP-007 completed a non-posting royalty statement proof, CAP-008 completed the bounded password-recovery/reset production proof, CAP-009 restored the governed app-only write lane and executed the approved Establishing Glory stage safe-write, CAP-011 completed its Level 1 production proof through the Author Operating Center, and CAP-010 reports Wave 2 capability status from Core-backed evidence.

No author communication was sent, no Business Central posting was made, no identity-sensitive catalog write was executed, and no Line Editing work began.

## Capability Exit Table

| Capability | Exit State | Evidence | Remaining Boundary |
|---|---|---|---|
| CAP-002 Line Editing | Controlled Initialization Complete - External Author Developmental Exit Hold | Locked source package, project style sheet, 80-item intake queue, and Core events `CAP002_SOURCE_PACKAGE_LOCKED`, `CAP002_PROJECT_STYLE_SHEET_CREATED`, `CAP002_INTAKE_QUEUE_VALIDATED`, `CAP002_CONTROLLED_INITIALIZATION_COMPLETED` | Developmental exit must be formally satisfied before substantive Line Editing begins |
| CAP-007 Financial and Royalty Operations | Level 1 Proof - Non-posting royalty statement proof complete; opening-balance external evidence hold | Synthetic royalty statement proof, idempotency key, source-line trace, rerun equivalence hash, and Core event `CAP007_ROYALTY_STATEMENT_PROOF_COMPLETED` | External bank/QBO/Bill.com evidence and BC foundation readback remain required before real posting or author-facing royalty statements |
| CAP-008 Author Identity and Experience | Level 2 Candidate - password recovery/reset proof complete | Forgot-password flow reached CIAM verification, Jackie completed code/password interaction, fresh password sign-in succeeded, callback returned to `jmerrill.pub`, durable session loaded Core author context, all three authorized projects rendered and switched, logout returned to the locked public state, and routine fresh sign-in succeeded. Core events: `CAP008_PASSWORD_RESET_PROVEN`, `CAP008_LOGOUT_AND_SESSION_TERMINATION_PROVEN`, `CAP008_LEVEL2_CANDIDATE_READY` | Explicit administrative session-revocation proof remains hardening; old-password rejection was not independently tested because Cody did not handle private password values |
| CAP-009 Bibliographic Identity and Catalog Governance | Safe Write Executed | Restored the intended `JM1-PUB-INTAKE-WEBAPI` app-only credential by appending a fresh Entra secret and vaulting it in `jm1-core-vault`; stamped Establishing Glory: The Library `jm1pub_stage` null to Editorial; readback passed; Core event `CAP009_BIBLIOGRAPHIC_SAFE_WRITE_EXECUTED` / `ff5d474f-1080-f111-ab0f-00224820105b` | Broader lineage/alias/identifier writes remain future governed packages only; unknown/blank title records remain excluded |
| CAP-010 Enterprise Command | Operational Enterprise Command - Wave 2 Coverage Proven | `2026-07-14-CAP-010-Operational-Refresh.json`, `.md`, and Core event `CAP010_WAVE2_OPERATIONAL_REFRESH_COMPLETED` | Promote refresh to governed dashboard/scheduled surface |
| CAP-011 Author Marketing and Launch Operations | Level 1 Controlled Proof Complete | PR #253 deployed the marketing-profile form/API; PR #254 repaired durable-session submission; PR #255 deployed idempotency guard. Production deployment runs: #253 `29380482077` / job `87242855125` / commit `885d803b`; #254 `29381007932` / job `87244436278` / commit `4e03e55b`; #255 `29392520462` / job `87278900448` / commit `5c8881a`. Live proof: unauthenticated POST returned 401; authenticated AOC rendered form; no-change submission wrote Core log `45009d2b-1280-f111-ab0f-000d3a14673b`; duplicate submit produced exactly one log for the idempotency key; mixed project switching passed; Core proof event `729d40df-1280-f111-ab0f-00224820105b` | Invalid project-scoped portal URL stayed in loading state without exposing unauthorized data; retain as UX hardening |

## Live Business Movement

- The Intentional Leader, Volume I remains protected from premature Line Editing. CAP-002 now has the locked source manuscript, style-sheet baseline, and 80-item intake queue required to begin only after the developmental exit boundary is satisfied.
- Financial operations now have a reusable non-posting royalty statement proof with deterministic totals and traceable source lines.
- Catalog governance now clearly separates completed stage backfill from still-held identity-sensitive bibliographic writes.
- Author identity recovery/reset has completed its bounded production proof and is no longer the Wave 2 human blocker.

## Cross-Capability Proof

- Validation passed: `npm run type-check`, `npm run lint`, `npm run build`, and `git diff --check`.
- Core execution evidence was written for CAP-002, CAP-007, CAP-009, and CAP-010.
- CAP-010 readback pulled 250 execution-log rows, 200 title rows, 2 editorial stage rows, and 3 approval gate rows.
- CAP-010 capability signal counts were refreshed after CAP-009 and CAP-011 completion.
- Wave 2 closure was recorded in Core as `ENTERPRISE_CAPABILITY_WAVE2_CLOSED`.

## Reusable Enterprise Outputs

- CAP-002 source package and style-sheet lock:
  - `docs/operations/generated/2026-07-14-CAP-002-Line-Editing-Source-Package.json`
  - `docs/operations/generated/2026-07-14-CAP-002-Line-Editing-Source-Package.md`
- CAP-007 royalty proof:
  - `docs/operations/generated/CAP-007-Royalty-Statement-Proof-2026-07-14.json`
  - `docs/operations/generated/CAP-007-Royalty-Statement-Proof-2026-07-14.csv`
- CAP-009 safe-write reconciliation and manifest:
  - `docs/operations/generated/2026-07-14-CAP-009-Bibliographic-Safe-Write-Reconciliation.json`
  - `docs/operations/generated/2026-07-14-CAP-009-Bibliographic-Safe-Write-Reconciliation.md`
  - `docs/operations/generated/2026-07-14-CAP-009-Bibliographic-Safe-Write-Manifest.md`
- CAP-010 operational refresh:
  - `docs/operations/generated/2026-07-14-CAP-010-Operational-Refresh.json`
  - `docs/operations/generated/2026-07-14-CAP-010-Operational-Refresh.md`

## Holds

- CAP-002: External author developmental exit hold.
- CAP-007: External finance evidence and BC foundation readback hold.
- CAP-008: Level 2 hardening hold only for explicit administrative session-revocation proof and old-password rejection if Jackie wants that independently observed.
- CAP-009: No Wave 2 blocker remains. Future catalog packages must remain separately governed.
- CAP-011: No Level 1 Wave 2 blocker remains. Invalid project-scoped URL loading behavior is retained as future UX hardening.

## Remaining Jackie Decisions

- Confirm the developmental exit boundary before substantive CAP-002 Line Editing begins.
- No additional Jackie action is required for CAP-009 or CAP-011 Wave 2 closure.
- Provide remaining CAP-007 external finance evidence required for BC foundation readback and real statement/posting progression.

## Wave 3 Recommendation

Do not start Wave 3 yet.

Wave 2 is closed. CAP-007 external finance evidence/readback remains a future finance hardening lane, not a technically removable Wave 2 blocker.
