# Enterprise Execution Backlog v1.0

Status: EXECUTION BACKLOG
Generated: 2026-07-15
Source basis: accepted ADR v0.4, merged Council remediation, canon-candidate standard, register seeds, capability maturity registry, Wave 2 closure evidence, verified tenant/runtime state
Production implementation authorized by this file: No

## Operating Principle

Governance now serves execution. Execution no longer waits for perfect governance.

No new governance artifact should be created unless it removes a real operational blocker for an active implementation. When a proposed task would only create documentation without directly enabling implementation, classify it as `LOW EXECUTION VALUE` and defer it unless Jackie explicitly requests it.

## Prioritization Scale

| Field | Values |
|---|---|
| Priority | P0, P1, P2, P3 |
| Business Value | High, Medium, Low |
| Risk | High, Medium, Low |
| Implementation Complexity | High, Medium, Low |
| Governance Readiness | Ready, Pending Jackie decision, External dependency, Future |

## Section A - Ready Now

These items may begin immediately after Jackie approval because governance exists, dependencies are substantially satisfied, and no blocking decision remains.

| Rank | Work Item | Objective | Expected Business Outcome | Prerequisite Approvals | Estimated Effort | Primary Repository Location | Implementation Owner | Success Evidence | Priority | Business Value | Risk | Complexity | Governance Readiness |
|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | CAP-002 Line Editing completion - The Intentional Leader | Continue from the Core-proven Line Editing stage and controlled January 1 sample into full Volume I line edit, style-sheet update, QA, and author-facing package preparation. | Prevents the commissioning title from stalling and creates the downstream editorial runway before more Developmental packages accumulate. | Developmental exit already completed in Core; Jackie release approval remains required before any author-facing Line Editing package is sent. | 5-10 days | `docs/operations/PROGRAM-003-*`, `docs/implementation/CAP-002-*`, SharePoint title package | Editorial Operations / Cody | Full line-edit package, QA pass, author package ready, Core/SharePoint/AOC reconciliation | P0 | High | Medium | High | Ready |
| 2 | Publisher Operating Center master workspace | Expand POC from queue processing into the master publisher surface across J0-J8, author actions, publisher actions, contracts, finances, marketing, production, distribution, and exceptions. | Jackie can see what is waiting, why, who owns it, and the next governed action in one place. | Jackie scope approval for live UI deployment. | 5-10 days | `app/publisher/operating-center`, `app/api/publisher/*`, `docs/operations/generated` | Publishing Operations / Cody | Master queue view, J0-J8 readiness, action controls, browser proof, CAP-010 refresh | P0 | High | Medium | High | Ready |
| 3 | Editorial workload and asset-readiness control | Add a single operating control for Editorial Review, Developmental, author review, Line Editing, Copyediting, Proofreading, QA, production readiness, owner, age, target date, and hold reason. | Prevents new titles and author-facing packages from overtaking downstream editorial capacity. | None for internal control; live UI deployment requires normal PR/release validation. | 2-4 days | `app/publisher/operating-center`, `lib/server/publisher-operating-center.ts`, `docs/operations/generated` | Publishing Operations / Cody | POC workload view, readiness guard, queue aging, CAP-010 metric refresh | P0 | High | Medium | Medium | Ready |
| 4 | CAP-001 Before You Were Born | Execute Developmental Editing planning on the initialized stage after the Line Editing runway is protected. | Moves CAP-001 beyond the single proof asset without displacing the commissioning title. | Developmental plan release requires Jackie approval before author-facing communication. | 3-5 days | `docs/operations/PROGRAM-003-*`, `jm1pub_editorialstage`, SharePoint title package | Editorial Operations | Source lock, developmental plan, QA evidence, Core events | P1 | High | Medium | High | Ready |
| 5 | CAP-001 The General's Will and Last Testament | Execute Developmental Editing planning with rights/sensitivity watchlist controls. | Proves CAP-001 against a second live asset shape while preserving risk controls. | Jackie approval for any author-facing communication or material rights/sensitivity decision. | 3-5 days | `docs/operations/PROGRAM-003-*`, `jm1pub_editorialstage`, SharePoint title package | Editorial Operations | Source lock, developmental plan, watchlist disposition, Core events | P1 | High | Medium | High | Ready |
| 6 | The Long Watch Editorial Review completion | Complete substantive Editorial Review for the newly initialized Long Watch stage and assign one governed outcome. | Converts reconciled source into a real publishing movement. | Jackie execution approval only. | 1-2 days | SharePoint manuscript evidence; `jm1pub_editorialstage`; `docs/operations/generated` | Editorial Operations / Cody | Review memo, stage outcome, next-stage or hold event | P1 | High | Medium | Medium | Ready |
| 7 | Establishing Glory compilation path | Build the source-content inventory, source-to-compilation crosswalk, duplication ledger, ownership/permissions check, and final editorial-path recommendation. | Prevents the active compilation from entering the wrong editorial lane. | Jackie publisher judgment for final path. | 3-6 days | SharePoint Establishing Glory package; `jm1pub_title`; `jm1pub_publishingasset` | Editorial Operations / Catalog Operations | Compilation decision package, Core hold/path update, execution log | P1 | High | Medium | High | Ready |
| 8 | Copyediting readiness runway | Define and prove the first Copyediting capability boundary after CAP-002 has a complete line-edited proof package. | Prevents the next downstream collision after Line Editing. | CAP-002 proof package complete; Jackie approval before author-facing copyedit package release. | 3-6 days | `docs/implementation/CAP-00*`, SharePoint title package | Editorial Operations | Copyediting workflow proof, QA standard, Core stage behavior | P1 | High | Medium | High | Ready |
| 9 | CAP-010 daily/weekly operating rhythm | Promote manual operational refresh into daily/weekly views for moved assets, failed actions, author/publisher actions, queue aging, editorial throughput, finance exceptions, and system health. | Enterprise Command becomes an operating rhythm instead of a report. | Jackie approval for cadence/location. | 3-5 days | `scripts/cap010_*`, `docs/operations/generated`, possible dashboard surface | Enterprise Operations | Daily/weekly refresh proof, metric deltas, execution-log event | P1 | High | Medium | Medium | Ready |
| 10 | CAP-007 non-posting finance continuation | Continue non-posting royalty/reconciliation model work while opening-balance remains on external evidence hold. | Finance capability advances without unsafe postings. | None beyond finance-lane execution approval. | 2-4 days | `scripts/cap007_*`, `docs/implementation/CAP-007-*`, `docs/operations/generated` | Finance Operations | Deterministic proof outputs, no BC posting, evidence ledger | P2 | Medium | Medium | Medium | Ready |

## Section B - Waiting on Jackie Decision

These are blocked only by one of the five pending Council Phase 3 approvals.

| Work Item | Objective | Unlocking Approval | Expected Business Outcome | Primary Repository Location | Implementation Owner | Success Evidence | Priority | Business Value | Risk | Complexity | Governance Readiness |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Promote Enterprise Capability Standard to canon | Change the standard from CANON-CANDIDATE to CANON after Jackie approval. | Enterprise Capability Standard | Establishes the execution standard as active canon. | `00_SYSTEM/Canon-Artifacts/JM1-Enterprise-Capability-and-Pipeline-Standard-v1.0.md` | Governance Registrar | Status update, PR, execution log | P0 | High | Low | Low | Pending Jackie decision |
| Adopt Capability Catalog as repository register | Mark Capability Catalog schema and 13-row seed as approved repository register template. | Capability Catalog | Enables governed capability tracking without guessing maturity. | `00_SYSTEM/Registers/Capability-Catalog/*` | Governance Registrar | Approved schema/seed status, validation pass | P1 | High | Low | Low | Pending Jackie decision |
| Adopt Pipeline Register J0-J8 seed | Approve schema and current J0-J8 seed without blanket stage certification. | Pipeline Register | Makes publishing lifecycle stage record operationally referenceable. | `00_SYSTEM/Registers/Pipeline-Register/*` | Governance Registrar / Publishing Ops | Approved seed, no certification overstatement | P1 | High | Low | Low | Pending Jackie decision |
| Adopt Agent Registry v2 package | Approve v2 schema package for future governed registry model and migration planning. | Agent Registry | Creates controlled path for agent records without commissioning agents. | `00_SYSTEM/Registers/Agent-Registry/*` | Governance Registrar / AI Operations | Approved schema package, no runtime activation | P2 | Medium | Medium | Medium | Pending Jackie decision |
| Decide Annex A authority model | Retain Candidate or approve authoritative with exceptions. | Annex A | Clarifies workload-map authority and exception handling. | `00_SYSTEM/Validation/ADR-JM1-V3-EXT-001-Annex-A-Validation-v0.1.md` | Governance Registrar | Decision record, exception table if approved | P2 | Medium | Medium | Low | Pending Jackie decision |
| Initialize repository governance registrar operating loop | Begin regular validation of the three-register set. | Capability Catalog + Pipeline Register + Agent Registry | Prevents register drift. | `00_SYSTEM/Registers/*` | Governance Registrar | Validation checklist, no approval authority overreach | P2 | Medium | Low | Medium | Pending Jackie decision |
| Convert pipeline stage evidence into regular status update | Use the approved Pipeline Register to update stage certification status from real proof. | Pipeline Register | Keeps J0-J8 operationally truthful. | `00_SYSTEM/Registers/Pipeline-Register/*`, `docs/operations/generated` | Publishing Operations | Stage evidence update PR, execution log | P2 | Medium | Medium | Medium | Pending Jackie decision |

## Section C - Waiting on External Dependency

These items are recognized but blocked by tenant, licensing, external platform, compliance, or evidence dependencies.

| Work Item | Blocker | Evidence Required to Remove Blocker | Objective After Unblocked | Primary Repository Location | Owner | Priority | Business Value | Risk | Complexity | Governance Readiness |
|---|---|---|---|---|---|---|---|---|---|---|
| CAP-007 opening-balance and BC posting readiness | External bank/QBO/Bill.com evidence and Business Central foundation readback remain incomplete. | Bank balance support, QBO cutover workpaper, Bill.com evidence, retained earnings/equity treatment, BC setup readback. | Decide retain/reverse/replace/reclassify opening entries and prepare safe posting path. | `docs/implementation/CAP-007-*`, `scripts/cap007_*` | Finance Operations | P0 | High | High | High | External dependency |
| Foundry / Claude capacity deployment | Approved quota/capacity must be proven in correct Foundry scope. | Subscription, region, provider, SKU, project, model/version, deployment capacity evidence. | Deploy model and run governed comparison/GPAT path. | `azure-functions/diagnostic-ai-runner`, `docs/implementation/PROGRAM-003A-*` | AI Runtime | P1 | High | High | High | External dependency |
| Tenant/workload entitlement verification for Annex A | Full entitlement/installation/provisioning ownership not fully exported. | Admin-center exports for M365, Entra, Power Platform, Foundry, Fabric/Power BI, SharePoint. | Remove Annex A exceptions and support implementation choices. | `00_SYSTEM/Validation/*` | Governance Registrar / IT Admin | P2 | Medium | Medium | Medium | External dependency |
| Business Central live migration | External finance evidence and cutover decision incomplete. | Approved cutover date, opening-balance decision, posting groups readback, test posting proof. | Begin controlled finance implementation. | `docs/implementation/IB-002-*`, `docs/implementation/CAP-007-*` | Finance Operations | P1 | High | High | High | External dependency |
| Canonical publishing sender full automation | Sender path depends on ACS/mail relay proof and mailbox/Graph permission posture. | Provider delivery proof, reply routing, SPF/DKIM/DMARC confirmation, application send/read permissions. | Use governed sender for repeatable author communications. | `docs/implementation`, mail relay configuration | Publishing Communications | P2 | Medium | Medium | Medium | External dependency |
| SharePoint Option B broader metadata stamping | Batch stamping of held records depends on Jackie-reviewed decisions and safe-write manifests. | Confirmed Lane B/C or unknown-title decisions, manifest, app credential proof. | Stamp metadata safely beyond completed lanes. | `docs/operations/generated`, SharePoint library | Catalog Operations | P2 | Medium | Medium | Medium | External dependency |

## Section D - Future Waves

These are already recognized by governance but intentionally deferred. Do not expand them into new architecture unless a real operational blocker requires it.

| Future Wave | Recognized Work | Current Boundary | Recommended Trigger | Priority | Business Value | Risk | Complexity | Governance Readiness |
|---|---|---|---|---|---|---|---|---|
| Financial F0-F8 implementation | Full financial lifecycle pipeline in Business Central and supporting systems. | CAP-007 evidence hold and BC readback. | Opening-balance decision and non-posting proof promoted. | P1 | High | High | High | Future |
| Foundation pipeline implementation | Nonprofit/foundation lifecycle pipeline. | Commercial publishing proof still primary; separate entity boundary must be preserved. | Pipeline Register/Capability Catalog approved and foundation proof asset selected. | P2 | High | Medium | High | Future |
| Enterprise Command Center | Operational command surface and metrics. | CAP-010 manual refresh proven; scheduled/dashboard promotion pending. | CAP-010 refresh scheduling succeeds. | P1 | High | Medium | Medium | Future |
| Communications Authority Matrix | Governed communication authority across email, portal, ACS, Outlook, Teams. | Sender and mailbox permission evidence still being hardened. | Canonical sender and reply-routing proof complete. | P2 | Medium | Medium | Medium | Future |
| Enterprise Analytics Platform ADR | Analytics/Fabric/Power BI platform decision and implementation. | Entitlement and workspace evidence incomplete. | Annex A/tenant verification and CAP-010 scheduled refresh. | P3 | Medium | Medium | High | Future |
| Sentinel commissioning | Guard/monitor agent role. | Agent Registry approval and commissioning evidence required. | Agent Registry v2 approved and sentinel scope/risk evidence available. | P3 | Medium | High | High | Future |
| Process Analyst | Process-discovery/recommendation agent role. | Agent Registry approval and A1/A2 evidence required. | Agent Registry v2 approved and first bounded process scope selected. | P3 | Medium | Medium | Medium | Future |
| Agent Factory | Agent creation/scaffolding function. | Agent Factory cannot activate or commission agents; registry/approval model pending. | Agent Registry v2 approval plus separate implementation authority. | P3 | Medium | High | High | Future |
| Commercialization readiness | Package certified capabilities for repeatable external/commercial use. | Requires two materially different implementations and ADR commercialization conditions. | Second proof asset completes for a capability. | P3 | High | High | High | Future |

## The Intentional Leader Commissioning Path Controls

Live Core readback on 2026-07-15 shows:

- `Developmental Editing - The Intentional Leader, Volume I`: `Complete`
- `Line Editing - The Intentional Leader, Volume I`: `In Progress`
- Latest relevant execution evidence: `DEVELOPMENTAL_EXIT_COMPLETED`, `CAP002_LINE_EDITING_STARTED`, and `CAP002_CONTROLLED_SAMPLE_COMPLETED - The Intentional Leader January 1`
- Author-facing stage summary: `Line editing has begun for Volume I. No action is required from you at this time.`

Controlled sequence:

1. Finish full Volume I Line Editing.
2. Run internal QA and voice-preservation review.
3. Validate and update the Project Style Sheet.
4. Prepare the author-facing Line Editing package.
5. Hold release until Jackie approves the package.
6. Do not advance Copyediting until Line Editing package completion and the governed gate are recorded.

Readiness guard:

No author-facing asset may imply a stage or readiness level beyond the governed manuscript state.

## Editorial Workload and Asset-Readiness Control

The Publisher Operating Center must expose one finite workload control showing:

| Queue State | Required Fields |
|---|---|
| Awaiting Editorial Review | Title, author, asset, owner, age, target date, source evidence, blocker |
| Awaiting Developmental Editing | Editorial Review outcome, stage entry criteria, owner, target date, author-facing package status |
| Developmental In Progress | manuscript version, current package, QA state, author action, publisher action |
| Awaiting Author Review | released artifact, delivery channel, response deadline, gate state |
| Awaiting Line Editing | Developmental exit event, style sheet, manuscript lock, owner |
| Line Editing In Progress | sample status, full edit status, QA, style-sheet state, package readiness |
| Awaiting Copyediting | Line Editing package/gate state, unresolved queries, owner |
| Awaiting Proofreading | Copyedit completion, proof source, owner |
| Internal QA | QA checklist, exception count, publisher decision items |
| Production Ready | final manuscript, approvals, cover/interior readiness, production owner |
| Blocked | hold reason, external dependency, Jackie decision, next unblock step |

This control is P0 because newer Developmental packages must not overtake Line Editing, Copyediting, Proofreading, Production, Distribution, and Royalties.

## Unfinished Process Register - Execution View

| Process | Current State | Missing Completion Condition | Next Action | Owner | Dependency | Priority | Enterprise Reuse |
|---|---|---|---|---|---|---|---|
| The Intentional Leader Line Editing | Line Editing In Progress; controlled sample complete | Full line edit, QA, package, Jackie release approval | Continue full Volume I line edit | Cody | Manuscript/style sheet evidence | P0 | CAP-002 proof pattern |
| CAP-002 Line Editing capability | First proof initialized | Complete proof cycle and package | Finish TIL line edit | Cody | TIL proof package | P0 | Reusable downstream editorial stage |
| Copyediting | Not operationally certified | First controlled proof | Define after CAP-002 package | Cody | Line Editing complete | P1 | CAP-003 candidate |
| Proofreading | Not operationally certified | First controlled proof | Define after Copyediting | Cody | Copyediting complete | P1 | CAP-004 candidate |
| Publisher Operating Center master workspace | Queue/action surface active | J0-J8 master view and workload control | Implement master workspace expansion | Cody | Production POC branch | P0 | One internal command surface |
| Editorial workload and asset-readiness control | Identified as missing operating control | Queue states, owner, age, target date, readiness guard | Add to POC/CAP-010 | Cody | POC snapshot data | P0 | Throughput protection |
| Author-facing approval packages | Package flow proven for Developmental | Stage-synchronized release guard | Enforce readiness guard | Cody | Core stage/package truth | P0 | Prevents premature author asks |
| Author onboarding | Durable author auth Level 1 proven | Full lifecycle modules and recovery hardening | Continue AOC lifecycle after P0 editorial | Cody | CAP-008 hardening | P3 | Repeatable author identity |
| Contracts and payment handoff | Relationship and catalog rules exist | Unified publisher visibility | Surface blockers in POC | Cody | Core contract/payment fields | P2 | J0/J1/J2 controls |
| Metadata readiness | Stage metadata live; unresolved closure finite | Remaining exception closure and views | Maintain finite closure plan | Cody | CAP-009 manifest | P2 | Catalog governance |
| Production handoff | Not certified | Production intake and approval gates | Build after Proofreading | Cody | Proofreading complete | P1 | Production capability |
| Cover/interior production | Not certified | Design package, approval, QA | Build after production intake | Cody | Production handoff | P1 | Production asset workflow |
| Production approval | Not certified | Publisher/author approval capture | Define with production proof | Cody/Jackie | Production package | P1 | Approval gate standard |
| Distribution handoff | Not certified | Channel package and validation | Build after production approval | Cody | Final production assets | P1 | J6/J7 readiness |
| Channel reconciliation | Not certified | Marketplace/channel evidence | Build with distribution proof | Cody | Distribution handoff | P1 | Catalog/channel truth |
| Post-distribution reporting | Not certified | Sales/distribution reporting cadence | Build after first distribution proof | Cody | Channel evidence | P2 | Performance loop |
| Royalties | Non-posting models in progress | Recurring royalty proof and finance integration | Continue non-posting CAP-007 | Cody | Finance evidence hold | P2 | Financial operations |
| Annual distribution fees | Not operationalized | Billing/notification/payment workflow | Defer to finance phase | Cody | CAP-007/BC setup | P2 | Recurring revenue control |
| Catalog exception closure | Lane work and safe writes proven | Remaining finite exception cycle | Maintain closure manifest | Cody | Approved writes/evidence | P2 | Catalog hygiene |
| Relationship and Contact population | Partially operational | Reconciliation queue closure | Continue Core-only population | Cody | Relationship evidence | P3 | Relationship activation |
| Browser truth validation | AOC/POC proofs exist | Repeatable regression cadence | Include in release checks | Cody | Auth/session stability | P3 | Portal reliability |
| AOC lifecycle modules | Relationship dashboard live | Full author lifecycle modules | Continue after editorial P0 | Cody | CAP-008/CAP-011 | P3 | Author experience |
| Business Central dependencies | External evidence hold | Workpaper/bank/equity evidence | Continue non-posting only | Cody/External | Finance evidence | P2 | Finance runway |
| Communications-template authority | Sender/proof partially hardened | Authority matrix and template controls | Defer until sender proof | Cody | Mailbox/ACS evidence | P3 | Governed communications |
| CAP-010 exception visibility | Manual refresh evidence exists | Daily/weekly operating cadence | Build refresh rhythm | Cody | POC/register data | P1 | Enterprise command |
| Claude/Foundry/GPAT | Runtime work recognized | Capacity/routing/JSON hardening | Continue as support lane | Cody/External | Foundry capacity | P3 | AI editorial support |
| Power Automate flow inventory | Unfinished process | Inventory and ownership map | Defer until POC/Line Editing | Cody | Tenant access | P3 | Automation governance |

## Top 10 Executable Work Items

1. Complete CAP-002 Line Editing for The Intentional Leader because the commissioning title is already in Line Editing and now carries the first downstream capacity risk.
2. Finalize the Publisher Operating Center master workspace because Jackie needs one operating surface to prevent invisible queue collisions.
3. Activate editorial workload and asset-readiness control because author-facing packages must not outrun manuscript truth.
4. Continue CAP-001 on Before You Were Born because it is initialized and can move once the Line Editing runway is protected.
5. Continue CAP-001 on The General's Will and Last Testament because it is initialized but has added rights/sensitivity controls.
6. Complete The Long Watch Editorial Review because it is active in Core and ready for a governed outcome.
7. Complete Establishing Glory compilation-path reconciliation because its active compilation posture must be assigned the right editorial path.
8. Define Copyediting readiness because Line Editing will immediately create the next downstream dependency.
9. Operationalize CAP-010 daily/weekly rhythm because the unified register must feed a living command cadence.
10. Continue CAP-007 non-posting finance work because finance can advance safely without changing external-evidence holds.

## Immediate Execution Recommendation

Start with downstream runway, not another governance package:

1. Continue full CAP-002 Line Editing on The Intentional Leader from the Core-proven `In Progress` state.
2. Expand the Publisher Operating Center into the master workspace for J0-J8 visibility, workload aging, readiness guards, and governed actions.
3. Keep Before You Were Born and The General's Will moving carefully without letting new Developmental packages outrun Line Editing, Copyediting, Production, Distribution, and Royalties.
4. Complete The Long Watch and Establishing Glory movements with author-facing readiness guarded by Core stage truth.

This sequence turns architecture into operational capacity while preserving every pending governance decision boundary.
