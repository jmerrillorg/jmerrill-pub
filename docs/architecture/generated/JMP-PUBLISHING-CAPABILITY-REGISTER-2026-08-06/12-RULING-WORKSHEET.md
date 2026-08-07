# Ruling Worksheet

Status: EXECUTIVE-RULED WORKSHEET / CANONICAL AFTER PR #435 MERGE

Date: 2026-08-07

Scope: PR #435 Publishing Capability Register ruling preparation. No implementation, design, schema, runtime, automation, author communication, or production-system change is authorized by this worksheet.

## Section A - ABSORB Rows

ABSORB rows: 19. Assessed material loss: 5. Assessed partial loss: 13. Assessed nothing: 1.

Rows with material or partial loss are listed first. Jackie completed the ruling pass on 2026-08-07. ABSORB preserves unique functions, controls, evidence references, and aliases under the ruled parent capability.

### A1. Author Communications

Prior aliases: ACS relay; templates; author package notification; shared mailbox

Proposed parent capability: Author Experience

What this capability uniquely does: Controls how authors are contacted, what templates are used, and how delivery/archive evidence prevents false response clocks.

What stops happening if absorbed: MATERIAL LOSS: communication governance, template discipline, and delivery evidence can disappear inside broad author experience language.

Evidence paths: lib/server/author-communication-brand.ts; lib/server/publishing-dispatch-service.ts

Ruling: RETAIN (Jackie ruled 2026-08-07); Communication governance, delivery proof, templates, and response-clock integrity remain visibly named under Author Experience.

### A2. Author Operating Center

Prior aliases: Author portal; Author Workspace; relationship dashboard

Proposed parent capability: Author Experience

What this capability uniquely does: Gives authors a governed place to see status, complete setup, and respond to publishing actions without internal system vocabulary.

What stops happening if absorbed: MATERIAL LOSS: the author-facing operating surface can be treated as optional UX instead of the author status and action channel.

Evidence paths: lib/server/author-portal-access.ts; lib/server/author-portal-context.ts

Ruling: RETAIN (Jackie ruled 2026-08-07); Author Experience is the family; the Operating Center remains the distinct channel through which authors act.

### A3. Distribution Readiness and Submission

Prior aliases: OP-008; OP-009; Ingram/distribution command

Proposed parent capability: Production & Distribution

What this capability uniquely does: Packages release files, metadata, identifiers, and submission evidence for distribution channels.

What stops happening if absorbed: MATERIAL LOSS: distributor submission/readback can be treated as ordinary production completion, losing external-channel evidence boundaries.

Evidence paths: docs/implementation/OP-009-Distribution-Command-Center.md; docs/operations/int-pub-005-milestone-8-distribution-setup-readiness.md

Ruling: RETAIN (Jackie ruled 2026-08-07); Submission, distributor acceptance/readback, and external-channel proof remain distinct from producing files.

### A4. Payment Capture and Authorization

Prior aliases: Payment options; Stripe commissioning payment; payment gate

Proposed parent capability: Commercial Operations

What this capability uniquely does: Captures payment option, payment evidence, and authorization boundaries before fulfillment or downstream publishing work proceeds.

What stops happening if absorbed: MATERIAL LOSS: payment authority can blur into general commercial status, risking agreement or fulfillment movement without clear payment evidence.

Evidence paths: lib/server/stripe/author-workspace-stripe.ts; app/api/author/stripe/webhook/route.ts

Ruling: RETAIN (Jackie ruled 2026-08-07); Publishing retains a visible payment/authorization gate where Stripe/payment truth intersects fulfillment authorization.

### A5. Royalty Calculation and Statements

Prior aliases: CAP-007 royalty proof; royalty statements; payment allocation

Proposed parent capability: Post-Publication Operations

What this capability uniquely does: Calculates, reviews, and prepares royalty statements and royalty evidence after publication while preserving author/title lifecycle context.

What stops happening if absorbed: MATERIAL LOSS: royalties can be treated as accounting-only and lose title lifecycle triggers, identity holds, and author-statement controls.

Evidence paths: scripts/cap007_royalty_controlled_proof.mjs; docs/implementation/JM1-PAY-001-Author-Payout-Royalty-Governance-Standard-v1.0.md

Ruling: RETAIN (Jackie ruled 2026-08-07); Royalties remain a distinct post-publication obligation and do not disappear into accounting or generic post-publication language.

### A6. Cover Design

Prior aliases: OP-006 Cover Design Command Center; cover brief

Proposed parent capability: Production & Distribution

What this capability uniquely does: Controls cover concept, selection, wrap readiness, and author/publisher approval evidence.

What stops happening if absorbed: PARTIAL LOSS: cover-specific approval, evidence, and production dependencies can be buried under production work.

Evidence paths: docs/operations/generated/2026-07-19-The-Intentional-Leader-Cover-Concept-Development-Package.md

Ruling: ABSORB (Jackie ruled 2026-08-07); Absorbed into Production & Distribution with cover-specific approval, QA, and production dependencies preserved.

### A7. Editorial Command Center

Prior aliases: OP-005; editorial command; developmental/copy/proof lanes

Proposed parent capability: Editorial

What this capability uniquely does: Coordinates editorial stage movement, recommendations, artifacts, and publisher review across developmental, line, copy, and proof work.

What stops happening if absorbed: PARTIAL LOSS: stage-level editorial coordination can be reduced to generic editing unless package gates and editorial queues remain explicit.

Evidence paths: docs/doctrine/PROGRAM-003-Editorial-Doctrine.md; lib/program003/editorial-command.ts

Ruling: ABSORB (Jackie ruled 2026-08-07); Absorbed as the operating mechanism for Editorial with queues and gates preserved explicitly.

### A8. Interior Layout and Vellum Production

Prior aliases: OP-007; Vellum source; layout QA

Proposed parent capability: Production & Distribution

What this capability uniquely does: Turns approved text and formats into governed interior/layout outputs with template and proof readiness controls.

What stops happening if absorbed: PARTIAL LOSS: Vellum/source/layout authority can be flattened into distribution readiness and lose file lineage discipline.

Evidence paths: lib/server/vellum-title-template-governance.ts; docs/operations/generated/2026-07-19-The-Intentional-Leader-Interior-Layout-Readiness.md

Ruling: ABSORB (Jackie ruled 2026-08-07); Absorbed as a Production & Distribution lane with source lineage, layout QA, and proof controls preserved.

### A9. Lead and Opportunity Management

Prior aliases: Lead; opportunity; D365 Sales; milestone 6 opportunity update

Proposed parent capability: Commercial Operations

What this capability uniquely does: Tracks the commercial handoff from inquiry into a qualified business opportunity so quote, agreement, and payment work are not handled as disconnected tasks.

What stops happening if absorbed: PARTIAL LOSS: D365/Sales-style pipeline accountability can be flattened into generic commercial operations unless lead-to-opportunity ownership remains explicit.

Evidence paths: azure-functions/diagnostic-ai-runner/src/functions/runMilestone6OpportunityUpdate.js; docs/implementation/PROGRAM-004-Microsoft-Capability-Utilization-Matrix-2026-07-26.csv

Ruling: ABSORB (Jackie ruled 2026-08-07); Absorbed into Commercial Operations, preferably leveraging Dynamics 365 Sales rather than a separate JMP command center.

### A10. Line Copy and Proof Editing

Prior aliases: CAP-002; CAP-003; proofreading packages

Proposed parent capability: Editorial

What this capability uniquely does: Maintains the distinct post-developmental editorial lanes that prepare text for production without treating all editing as one activity.

What stops happening if absorbed: PARTIAL LOSS: later editorial stages can be overshadowed by developmental editing and lose their own source/package QA boundaries.

Evidence paths: scripts/cap002_priority1_line_edit.py; scripts/cap003_copyediting.py

Ruling: ABSORB (Jackie ruled 2026-08-07); Absorbed as explicit editorial stages under Editorial without independent top-level capability status.

### A11. Newsletter and Reader Updates

Prior aliases: Newsletter route; reader signup; lifecycle emails

Proposed parent capability: Strategic Marketing

What this capability uniquely does: Captures and routes newsletter/reader update interest and supports lifecycle communication when consent and tooling are governed.

What stops happening if absorbed: PARTIAL LOSS: consent, subscription capture, and routine audience communication can be buried under marketing strategy.

Evidence paths: docs/audits/issue-12-form-integration-audit.md; app/api/newsletter/route.ts

Ruling: ABSORB (Jackie ruled 2026-08-07); Absorbed as a Strategic Marketing channel/tactic with audience consent and subscription rules preserved.

### A12. No-Cost Author Marketing Framework

Prior aliases: No-cost marketing; author launch support

Proposed parent capability: Strategic Marketing

What this capability uniquely does: Defines author-facing marketing help that can be delivered without creating a separate paid campaign or new commercial promise.

What stops happening if absorbed: PARTIAL LOSS: included no-cost support can vanish into general marketing without a boundary between included and paid/special support.

Evidence paths: docs/implementation/JM1-Capability-Maturity-Registry.md; app/author/marketing-profile/page.tsx

Ruling: RETAIN (Jackie ruled 2026-08-07); Retained as the boundary between included JMP support and separately scoped marketing, preserving prior strategic work.

### A13. Publisher Operating Center

Prior aliases: Publisher Today; decision queues; operations dashboard

Proposed parent capability: Executive Control

What this capability uniquely does: Aggregates today-facing decisions, queues, and review items so Jackie does not manually reconstruct operational state.

What stops happening if absorbed: PARTIAL LOSS: daily executive visibility can vanish into static documents if the operating-center function is not preserved.

Evidence paths: lib/server/publisher-operating-center.ts; app/publisher/page.tsx

Ruling: RETAIN (Jackie ruled 2026-08-07); Retained because a single-operator enterprise needs daily visibility without manual reconstruction.

### A14. Release Live Confirmation

Prior aliases: Launch readiness; release anchor; confirmed live

Proposed parent capability: Production & Distribution

What this capability uniquely does: Confirms that a title or edition is actually live or accepted through evidence rather than assumption.

What stops happening if absorbed: PARTIAL LOSS: confirmed-live readback can blur with planned release or submission date if absorbed without a distinct proof rule.

Evidence paths: docs/architecture/generated/JMP-SLICE-3-IMPLEMENTATION-PLANNING-v1.0/06-executionlog-event-contract.md

Ruling: ABSORB (Jackie ruled 2026-08-07); Absorbed into Production & Distribution with submitted-not-live proof rule preserved.

### A15. Revenue and Accounting

Prior aliases: Business Central linkage; revenue; accounting

Proposed parent capability: Financial Operations

What this capability uniquely does: Handles accounting-facing revenue, Business Central posture, and financial close evidence distinct from publishing lifecycle movement.

What stops happening if absorbed: PARTIAL LOSS: revenue evidence can be mixed with lifecycle royalties or commercial payment status unless accounting ownership remains clear.

Evidence paths: docs/implementation/IS-002-Business-Central-Configuration-Specification.md; docs/implementation/PROGRAM-004-Commissioning-Microsoft-Productization-Delta-Report-2026-07-26.md

Ruling: RETAIN (Jackie ruled 2026-08-07); Financial Operations remains visibly real; Business Central/accounting does not disappear behind publishing lifecycle language.

### A16. Strategic Marketing Command Center

Prior aliases: OP-010; strategic marketing command center

Proposed parent capability: Strategic Marketing

What this capability uniquely does: Groups title, author, and JMP marketing actions around lifecycle events, campaign decisions, and launch readiness.

What stops happening if absorbed: PARTIAL LOSS: marketing can remain a concept without a working lifecycle calendar or owner if the command-center function disappears.

Evidence paths: docs/implementation/OP-010-Marketing-Command-Center.md; docs/operations/int-pub-005-milestone-9-launch-release-readiness.md

Ruling: RETAIN (Jackie ruled 2026-08-07); Retained as the identifiable operating mechanism for lifecycle-triggered JMP, author, and title marketing.

### A17. Stripe and Payout Enrollment

Prior aliases: Stripe Connect; payout enrollment; author financial setup

Proposed parent capability: Financial Operations

What this capability uniquely does: Captures author payout/Stripe readiness while preventing unauthorized transfers, royalty payables, or payment actions.

What stops happening if absorbed: PARTIAL LOSS: payout enrollment can be confused with money movement if absorbed without Stripe gate boundaries.

Evidence paths: scripts/author_payout_enrollment_governance.test.mjs; lib/server/stripe/author-workspace-stripe.ts

Ruling: ABSORB (Jackie ruled 2026-08-07); Absorbed into Financial Operations with enrollment/readiness kept distinct from money movement.

### A18. Workflow Engine and Dispatch Services

Prior aliases: canonical workflow engine; PROGRAM-006 dispatch; package release

Proposed parent capability: Enterprise Support

What this capability uniquely does: Executes governed workflow/dispatch mechanics, validates packages, records evidence, and prevents false author-response states.

What stops happening if absorbed: PARTIAL LOSS: package delivery and state transition mechanics can become ad hoc if absorbed only as enterprise support.

Evidence paths: lib/server/publishing-dispatch-service.ts; scripts/program006_publishing_dispatch_service.test.mjs

Ruling: ABSORB (Jackie ruled 2026-08-07); Absorbed as Enterprise Support enabling infrastructure, not a separate business capability Jackie operates.

### A19. Microsoft Ecosystem and Tenant Support

Prior aliases: M365; SharePoint; Exchange; Bookings; Power Platform; reporting

Proposed parent capability: Enterprise Support

What this capability uniquely does: Provides platform and tenant-support visibility for Microsoft services, entitlement status, and operational support dependencies.

What stops happening if absorbed: NOTHING

Evidence paths: docs/implementation/PROGRAM-004-Commissioning-Microsoft-Productization-Delta-Report-2026-07-26.md

Ruling: ABSORB (Jackie ruled 2026-08-07); Absorbed into Enterprise Support with no meaningful loss; Microsoft support is not a standalone Publishing capability.


## Section B - Conflicts

Conflict blocks: 8. Shared or split ownership is not offered as a ruling answer. Each block presents a single-system Cody assessment for Jackie to accept or replace.

### B1. Edition / Product Form instance

Data object in dispute: Edition / Product Form instance

Claimant systems and basis of claim: `jm1pub_edition` target; `jm1pub_publishingasset`; artifact records.

Cody assessed authoritative claimant: Dataverse `jm1pub_edition`.

Why: The title/PF lifecycle architecture and Slice 3 planning both require an edition-level authority; publishing assets should reference outputs, not own lifecycle state.

Downstream dependencies affected either way: PF state machine, release dates, ISBN assignment, author-facing status, distribution events, correction handling.

Ruling: Dataverse `jm1pub_edition` (Jackie ruled 2026-08-07)

### B2. Manuscript source

Data object in dispute: Manuscript source

Claimant systems and basis of claim: SharePoint governed title folder; generated repository copies; local files.

Cody assessed authoritative claimant: SharePoint governed title folder.

Why: The Operating Manual and SOPs treat the governed title folder/source file as controlling; generated repo copies preserve evidence but must not become source authority.

Downstream dependencies affected either way: Editorial start, source lineage, author-review packages, production source lock, correction packages.

Ruling: SharePoint governed title folder (Jackie ruled 2026-08-07)

### B3. Editorial artifact

Data object in dispute: Editorial artifact

Claimant systems and basis of claim: `jm1pub_editorialartifact`; `jm1pub_publishingasset`; SharePoint files.

Cody assessed authoritative claimant: SharePoint governed artifact/file location.

Why: The actual artifact is the governed file; Dataverse/reference records should identify and govern it, not replace file authority.

Downstream dependencies affected either way: Author package QA, artifact visibility, checksums, source/output relationships, internal leakage controls.

Ruling: SharePoint governed artifact/file location (Jackie ruled 2026-08-07)

### B4. Distribution job

Data object in dispute: Distribution job

Claimant systems and basis of claim: Distribution command center; execution log; proposed `jm1_distributionjob`.

Cody assessed authoritative claimant: Dataverse `jm1_executionlog`.

Why: Current approved design uses execution-log events first and holds job-table implementation pending authority.

Downstream dependencies affected either way: Submission attempts, acceptance/rejection readback, idempotency, live confirmation, author status projection.

Ruling: Dataverse `jm1_executionlog` (Jackie ruled 2026-08-07)

### B5. Release plan

Data object in dispute: Release plan

Claimant systems and basis of claim: Title fields; proposed release-plan row; edition dates.

Cody assessed authoritative claimant: Dataverse title/edition records.

Why: Until a release-plan entity is separately approved, release anchor/submission/live dates should live with the title/edition authority rather than an unapproved planning object.

Downstream dependencies affected either way: 21-day propagation, release anchor changes, edition schedules, author-facing status, distribution readiness.

Ruling: Dataverse title/edition authority (Jackie ruled 2026-08-07)

### B6. Royalty statement

Data object in dispute: Royalty statement

Claimant systems and basis of claim: CSV manifests; Dataverse royalty schema; Business Central.

Cody assessed authoritative claimant: Dataverse royalty tables.

Why: Dataverse royalty statement/line tables are the designed operational statement authority; Business Central is accounting/posting support after approval.

Downstream dependencies affected either way: Royalty calculation, statement review, payment allocation, author delivery, BC handoff.

Ruling: Dataverse royalty statement/line authority; Business Central remains accounting/payable/posting/payment/GL authority (Jackie ruled 2026-08-07)

### B7. Payment evidence

Data object in dispute: Payment evidence

Claimant systems and basis of claim: Stripe; Dataverse opportunity payment status; Business Central.

Cody assessed authoritative claimant: Stripe.

Why: Stripe is the source of payment transaction truth; Dataverse and Business Central should store status/projection/posting evidence after Stripe confirmation.

Downstream dependencies affected either way: Payment authorization, fulfillment unlocks, revenue recognition, refund/payment exception handling.

Ruling: Stripe (Jackie ruled 2026-08-07)

### B8. Microsoft entitlement state

Data object in dispute: Microsoft entitlement state

Claimant systems and basis of claim: Program 004 matrix; Annex A entitlement register; tenant admin/license evidence.

Cody assessed authoritative claimant: Microsoft tenant/license readback.

Why: Repository matrices record evidence, but current entitlement authority must come from the Microsoft tenant/license source.

Downstream dependencies affected either way: Reuse gate, activation decisions, build-vs-configure decisions, spend/entitlement blockers.

Ruling: Microsoft tenant/license readback (Jackie ruled 2026-08-07)


## Section C - RETAIN Rows

| Capability | Parent capability | One-line reason | Jackie bulk confirmation |
| --- | --- | --- | --- |
| Executive Control | Executive Control | Retain because it is current authority or a directly usable capability under the nine-capability model. | RETAIN (Jackie ruled 2026-08-07) |
| Successor Operations Hub | Enterprise Support | Retain because it is current authority or a directly usable capability under the nine-capability model. | RETAIN (Jackie ruled 2026-08-07) |
| Current Authority and Work View | Executive Control | Retain because it is current authority or a directly usable capability under the nine-capability model. | RETAIN (Jackie ruled 2026-08-07) |
| Inquiry Intake | Commercial Operations | Retain because it is current authority or a directly usable capability under the nine-capability model. | RETAIN (Jackie ruled 2026-08-07) |
| Quote Package and Pricing | Commercial Operations | Retain because it is current authority or a directly usable capability under the nine-capability model. | RETAIN (Jackie ruled 2026-08-07) |
| Agreement Governance and Generation | Commercial Operations | Retain because it is current authority or a directly usable capability under the nine-capability model. | RETAIN (Jackie ruled 2026-08-07) |
| Author Onboarding | Author Experience | Retain because it is current authority or a directly usable capability under the nine-capability model. | RETAIN (Jackie ruled 2026-08-07) |
| Developmental Editing | Editorial | Retain because it is current authority or a directly usable capability under the nine-capability model. | RETAIN (Jackie ruled 2026-08-07) |
| Correction Authorization | Editorial | Retain because it is current authority or a directly usable capability under the nine-capability model. | RETAIN (Jackie ruled 2026-08-07) |
| PF State Machine | Production & Distribution | Retain because it is current authority or a directly usable capability under the nine-capability model. | RETAIN (Jackie ruled 2026-08-07) |
| Product Form and Edition Lifecycle | Production & Distribution | Retain because it is current authority or a directly usable capability under the nine-capability model. | RETAIN (Jackie ruled 2026-08-07) |
| Complimentary Author Copies | Post-Publication Operations | Retain because it is current authority or a directly usable capability under the nine-capability model. | RETAIN (Jackie ruled 2026-08-07) |
| Author Marketing Profile | Strategic Marketing | Retain because it is current authority or a directly usable capability under the nine-capability model. | RETAIN (Jackie ruled 2026-08-07) |
| Evidence and Execution Logging | Enterprise Support | Retain because it is current authority or a directly usable capability under the nine-capability model. | RETAIN (Jackie ruled 2026-08-07) |
