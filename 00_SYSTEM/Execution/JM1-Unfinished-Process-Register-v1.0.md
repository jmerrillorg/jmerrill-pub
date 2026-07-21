# JM1 Unfinished Process Register v1.0

Status: EXECUTION CONTROL REGISTER
Generated: 2026-07-15
Purpose: prevent pipeline compression by tracking unfinished operational processes that can block live assets.
Production implementation authorized by this file: No

## Executive Risk

JM1's current publishing pipeline is front-heavy:

```text
Intake -> Editorial Review -> Developmental Editing
```

is advancing faster than:

```text
Line Editing -> Copyediting -> Proofreading -> Production -> Distribution -> Royalties
```

The immediate enterprise risk is that new titles reach downstream stages before those stages are operationally proven.

## P0 - Immediate Pipeline-Control Gaps

| Unfinished Process | Current Truth | What Must Be Completed | Priority | Owner | Success Evidence |
|---|---|---|---|---|---|
| The Intentional Leader Developmental exit | Core shows Developmental Editing Complete, `DEVELOPMENTAL_EXIT_COMPLETED`, and Line Editing In Progress. | No exit work remains; continue full Line Editing package through QA and Jackie release boundary. | Closed for exit; P0 for downstream line edit | Editorial Operations | `DEVELOPMENTAL_EXIT_COMPLETED`, `CAP002_LINE_EDITING_STARTED`, `CAP002_CONTROLLED_SAMPLE_COMPLETED`. |
| CAP-002 Line Editing operational proof | Source package, Project Style Sheet, and controlled January 1 sample are complete; no complete full-volume Line Editing cycle proven. | Complete full Volume I Line Edit, style-sheet update, change summary, QA, author-facing package, Core/SharePoint/AOC reconciliation. | P0 | Editorial Operations | Line Editing proof package, QA pass, author package ready, execution logs. |
| Line Editing capacity for new assets | Several titles are entering or approaching Developmental Editing. | Certify reusable Line Editing workflow before new titles reach Developmental exit. | P0 | Editorial Operations | Reusable workflow, second-title readiness, Level 2 certification candidate. |
| Publisher master workspace | Publisher Operating Center exists and initiates bounded intake/editorial actions. | Expand into master publishing surface across editorial, production, distribution, marketing, contracts, finances, author actions, and exceptions. | P0 | Publishing Operations | One surface shows all active assets, blockers, owners, next actions, and authorized actions. |
| Next-stage pipeline visibility | POC emphasizes intake and Editorial Review. | Add full J0-J8 readiness, owner, next action, aging, dependency, and action controls. | P0 | Publishing Operations | Queue shows current J0-J8 state, aging, owner, action, and blockers. |

## Editorial Pipeline

| Process | Current Truth | Unfinished Work | Next Movement |
|---|---|---|---|
| The Intentional Leader Line Editing | Developmental exit complete; Line Editing In Progress; controlled January 1 sample complete. | Complete full line edit, QA, author-facing package, Jackie release approval, Core/SharePoint/AOC reconciliation. | Continue as first downstream runway proof. |
| CAP-002 Enterprise Line Editing | Initialized but not live-cycle proven. | Live proof, package generator, deterministic change summary, style-sheet update, publisher exception review, QA standard, recovery proof, AOC behavior, second-title reuse proof, Level 2 package. | Complete The Intentional Leader proof, then second-title reuse. |
| Copyediting | No certified operational capability. | Governing-guide inheritance, style-sheet intake, mechanics/consistency workflow, correction-count method, query model, QA, author package, gates, Core/SharePoint/log integration. | Build after Line Editing sample proves boundaries. |
| Proofreading | No certified operational capability. | Typeset-proof intake, cold read, layout/pagination review, cross-reference validation, residual-error ledger, final corrections, proof approval, production handoff. | Build before first production proof. |
| Editorial Review throughput | Several reviews have moved; cycle not mature. | Standard artifacts, deterministic outcomes, cycle targets, assignment, rights/sensitivity routing, clarification package, decline path, CAP-001 initialization automation, dashboard reporting. | Fold into Publisher Operating Center Sprint 3. |

## Live Asset Queue

| Asset | Current Truth | Unfinished Work | Next Movement |
|---|---|---|---|
| The Intentional Leader, Volume I | Developmental Editing Complete; Line Editing In Progress; controlled sample complete. | Complete full CAP-002 Line Editing package and QA. | P0 downstream proof asset. |
| Before You Were Born | Editorial Review complete; CAP-001 Developmental Editing initialized Not Started. | Execute Developmental Editing cycle. | CAP-001 second-project proof candidate. |
| The General's Will and Last Testament | Editorial Review complete; CAP-001 Developmental Editing initialized Not Started with rights/sensitivity watchlist. | Execute Developmental Editing cycle with watchlist controls. | CAP-001 second-project proof candidate. |
| The Long Watch | Cluster reconciled; Editorial Review initialized In Progress. | Complete substantive Editorial Review and assign outcome. | P0 Editorial Review completion. |
| Establishing Glory: The Library | Separate active compilation; Editorial Review complete with publisher decision required. | Source-content inventory, source-to-compilation crosswalk, duplication ledger, ownership/permissions, compilation architecture, inclusion/exclusion decisions, metadata implications, final editorial path. | Publisher compilation-path decision package. |

## Production Pipeline

| Process | Unfinished Work | Current Boundary | Trigger |
|---|---|---|---|
| Production intake | Editorial-final acceptance, source lock, trim/format decisions, format matrix, work order, cover/interior requirements, schedule. | No Production capability proof. | First line-edited/proofread title reaches production. |
| Interior design/typesetting | Templates, format layout, page/spine calculations, image/tables/notes handling, accessibility, proof generation, QA. | Not operationally proven. | Production intake proof. |
| Cover production | Front cover approval, full wrap, spine, barcode/ISBN, printer specs, variants, author approval, final QA. | Not operationally proven. | Production intake proof. |
| Production approval gates | Internal QA, author proof approval, publisher final approval, production-ready package, distribution handoff. | Gate model incomplete downstream. | Production proof asset. |
| Section 508/accessibility | Government project requires compliance; reusable production capability not proven. | Accessibility proof needed before government-facing production. | Production template proof. |

## Distribution Processes

| Process | Unfinished Work | Current Boundary |
|---|---|---|
| Channel operating model | Ingram, CoreSource, KDP, ACX, Apple, B&N, PublishDrive, LSI access/hold. | Manual/incomplete. |
| Distribution package | Metadata, ISBN/edition/format mapping, files, pricing, rights, contributor data, BISAC, accessibility metadata, publication dates, descriptions, proof state, evidence. | No reusable package proof. |
| Distribution automation | CoreSource API/account proof, Ingram export/API, report imports, error handling, retries, distributor status reconciliation, POC controls. | Not operationally proven. |
| Post-distribution operations | Listing validation, metadata correction, availability, price changes, returns, retirement, revised editions, author copies, D2C links, sales reporting. | Future operations. |

## Financial and Royalty Operations

| Process | Current Truth | Unfinished Work | Boundary |
|---|---|---|---|
| Business Central foundation | CAP-007 proof-level maturity; foundation readback still incomplete. | Accounting periods, posting groups, dimensions, source codes, journal templates/batches, number series, permissions, persistence, production config. | External evidence and BC readback. |
| Opening balances | OB-20260701 remains provisional. | Bank statements, QBO tie-out, migration workpaper, retained earnings/equity, cutover date, final treatment. | No posting until explained. |
| QBO/Bill.com retirement | Not complete. | Exports, archive verification, customer/vendor crosswalk, invoices/payments, AP/AR, recurring transactions, attachments, 1099, audit history, rollback, cancellation timing. | External evidence. |
| Royalty operations | Calculation/statement proof exists. | Live imports, periods, actual statements, author/vendor linkage, BC liability, approvals, corrections, payment prep, statement delivery, payout reconciliation, tax reporting, dashboard. | No live payout until governed. |
| Stripe Connect | Incomplete. | Provider/legal entity, account type, onboarding, tax data, author experience, payout approval, idempotency, failures, BC reconciliation, production payout proof. | Separate finance/legal decision. |

## Author and Publisher Operating Surfaces

| Surface | Current Truth | Unfinished Work |
|---|---|---|
| Publisher Operating Center | Active for queue and bounded intake/editorial actions. | Master workspace coverage: authors, relationships, intakes, titles, assets, contracts, payments, stages, capabilities, author/publisher actions, evidence, holds, communications, production, distribution, royalties, marketing. |
| Publisher role model | Workforce sign-in works; jm1-admin has been used operationally. | Routine Jackie publisher identity, role set, least-privilege actions, attribution, monitoring. |
| POC reliability | Production proof exists for current scope. | Regression suite, queue performance, failed-action recovery, idempotency, concurrency, stale-data warning, audit display, browser acceptance, runbook, monitoring. |
| Author Operating Center | Live and durable identity proven. | Overview, all-project view, Editorial/Production/Marketing/Distribution/Royalties modules, messages/resources, approvals, uploads, clarification responses, accessibility, second-author proof. |

## AI Runtime, Integration, and Security

| Process | Unfinished Work | Boundary |
|---|---|---|
| Claude deployment | Locate approved quota, reconcile region/SKU/family, secure capacity 1, deploy Claude Sonnet 5, validate cost/latency/telemetry/fallback/kill switch. | External capacity evidence. |
| GPAT-001 | Structured JSON reliability, schema versioning, repair attempts, checkpointing, resumability, idempotency, bounded concurrency, retry/backoff, cost ceiling, full manuscript run, findings ledger, synthesis, comparison, certification. | Must support editorial throughput, not block it. |
| Power Automate inventory | Production/draft/stale flow inventory, ownership, triggers, dependencies, duplication, failures, env vars, logging, retirement, process mapping. | Do around live operations. |
| Relationships/contracts/party master | Core snapshot thin relative to catalog. | Relationship population, contact reconciliation, contract linkage, vendor/payee linkage, URL/party master, title ownership, rights holders, estate/beneficiary relationships, AOC authorization. | Core truth only. |
| Identity/security hardening | CAP-008 Level 2 candidate. | Second-author proof, access monitoring, staff recovery, session revocation, role lifecycle, deactivation, credential rotation, Key Vault standardization, alerting, Jackie certification. | Separate hardening lane. |

## Recommended Priority Order

### P0 - Prevent Pipeline Collision

1. Complete CAP-002 Line Editing on The Intentional Leader.
2. Finalize Publisher Operating Center as the master publisher workspace.
3. Activate editorial workload and asset-readiness control.
4. Continue CAP-001 on Before You Were Born.
5. Continue CAP-001 on The General's Will and Last Testament.
6. Complete The Long Watch Editorial Review.
7. Assign and begin the compilation path for Establishing Glory: The Library.

### P1 - Build Downstream Runway

8. Define and prove Copyediting.
9. Define and prove Proofreading.
10. Operationalize Production intake, cover, interior, and proof gates.
11. Prepare Distribution package and channel workflow.

### P2 - Financial Operations

11. Complete Business Central foundation.
12. Acquire QBO/Bill.com exports.
13. Resolve opening balances.
14. Prove recurring live royalty cycles.
15. Complete Stripe Connect decisions and controlled onboarding.

### P3 - Enterprise Scale

16. Complete Author Operating Center modules.
17. Expand CAP-011 marketing operations.
18. Operationalize catalog maintenance.
19. Complete CAP-010 daily/weekly rhythm.
20. Complete identity Level 2 certification.
21. Finish Claude/GPAT.
22. Reconcile Power Automate.
23. Populate relationships and contracts.

## Bottom Line

The next execution wave must build and operate the downstream runway while continuing new-title movement.

The two most urgent unfinished processes are:

1. Complete Line Editing on The Intentional Leader.
2. Finalize the Publisher Operating Center as Jackie's master enterprise publishing workspace.

Everything else should be sequenced so those two movements create capacity, not more architecture.
