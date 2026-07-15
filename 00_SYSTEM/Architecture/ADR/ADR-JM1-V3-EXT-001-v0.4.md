---
status: Accepted
approval_authority: Jackie
approval_date: 2026-07-14
classification: Spec-only
production_implementation_authorized: false
annex_a_status: Candidate — Validated but pending separate Jackie approval
baseline: JM1-CANON-CERT-001
source_text: /Volumes/UsersExternal/_INBOX/260715/ADR_JM1_V3_EXT_001_v0.4_Capability_Pipeline_Agent_Workforce.md
source_body_preserved_verbatim: true
---
# ADR — JM1 Enterprise Capability Map, Pipeline Standard & Agent Workforce Extension

| Field | Value |
|---|---|
| **ADR ID** | ADR-JM1-V3-EXT-001 — *the "V3" token is a historical draft identifier only and does not establish Architecture v3 as an approved baseline* |
| **Version** | v0.4 — v0.2 applied Council audit #1 (17 conditions); v0.3 added the Entitlement-First principle and Annex A per Jackie directive; v0.4 applies Council audit #2 (21 final document-control and licensing-accuracy conditions). Revision trace: **Annex B**. |
| **Status** | **CANON-CANDIDATE — Requires Jackie Approval** |
| **Classification** | Spec-only. No JM1-Core changes. Sprint-safe under JM1-SPRINT-90-001 scope freeze. This ADR does not authorize production implementation. |
| **Author** | Claude (Architect), JM1 AI Council; audited twice by Chad (Builder) |
| **Approval Authority** | Jackie (sole) |
| **Date** | July 14, 2026 |
| **Filing** | Draft: 00_SYSTEM / Architecture / ADR. Upon approval: ADR status becomes Accepted and remains in the ADR library; a separate canon standard ("JM1 Enterprise Capability & Pipeline Standard v1.0") is produced for 00_SYSTEM / Canon-Artifacts; register entries created in 00_SYSTEM / Registers. |
| **Baseline** | Extends the current certified architecture identified by **JM1-CANON-CERT-001**. References to "Architecture v3" are descriptive only unless v3 has been separately approved as the authoritative version. This ADR does not canonize any architecture version by indirect reference. |
| **Related Canon** | Model Sovereignty & Risk Doctrine v1.0; Manual-to-Governed Transition Doctrine v1.0; Dual-Purpose Build Doctrine; Human-First Operating Principle; JM1-SPRINT-90-001 v1.2 |

---

## 1. Context

The J Merrill Publishing J0–J8 pipeline forced JM1 to solve enterprise problems, not publishing problems: intake, qualification, contracts, orchestration, AI-assisted production, human approval gates, compliance screening, financial operations, communications, analytics, and continuous improvement.

Council review (Claude + Chad, July 2026) independently converged: the pipeline is the first commissioned implementation of an enterprise pattern. Analysis against the certified architecture (JM1-CANON-CERT-001) confirmed that nearly every proposed capability already has a ratified architectural home. This ADR therefore does **not** propose a new platform initiative. It recognizes the capability map, adds a small number of net-new governance elements, establishes the pipeline mechanics standard, and defines a planning-level Agent Workforce census with a governed self-improvement loop.

**Framing adopted:** J Merrill One operates an Enterprise Capability Platform. J Merrill Publishing is its first commissioned proving implementation. Every enhancement built for any brand is evaluated for promotion to shared enterprise capability.

**Governing distinction (canon-worthy):**

> **Mapped does not mean operational. Operational does not mean enterprise-promoted. Enterprise-promoted does not mean commercially ready.** Each capability, pipeline, and agent holds independent lifecycle, promotion, verification, and commercialization states, recorded in the registers.

---

## 2. Decision (Three Parts)

**Part A — Enterprise Capability Map.** The thirteen capability areas in Section 3 are **recognized as the initial JM1 Enterprise Capability Map**. Inclusion in the map does **not** certify operational readiness. Each capability retains independent maturity, evidence, ownership, and promotion state in the Capability Catalog. Two net-new governance elements are added: the Capability Catalog and the Capability Promotion Gate (Section 4). Commercialization is defined separately as a readiness layer, not a capability (Section 4.3). The Entitlement-First principle governs all builds (Section 4.4).

**Part B — Enterprise Pipeline Standard.** The required *mechanics* of a governed lifecycle pipeline are adopted (Section 5), together with the Pipeline Register (5.5). J0–J8 is the first certified reference implementation; its nine-stage numbering is **optional**, not mandatory.

**Part C — Agent Workforce Planning Census.** A three-tier, role-oriented census is adopted **for planning purposes only**. The roles are canon-candidates; **the agent count is non-canonical** and may expand, contract, or consolidate based on workload evidence, control boundaries, cost, and operational performance (Section 6). The autonomy framework (Section 7), the Agent Autonomy Promotion Gate (7.4), the governed self-improvement loop, and authority boundaries (Section 8) are adopted subject to the constraints stated there.

---

## 3. Part A — Enterprise Capability Map (Recognized, Not Certified)

Each capability is a workload of a layer already ratified under JM1-CANON-CERT-001. No new architecture is created by this section. Lifecycle and promotion states live in the Capability Catalog, not in this table.

| # | Capability | Architecture Home | Notes |
|---|---|---|---|
| 1 | Universal Intake Engine | Orchestration layer (Power Automate) + Dataverse spine | Proving implementation: INT-PUB-005 |
| 2 | Universal AI Router | Agent Workforce Layer + Agent Trust & Control Fabric; jm1_airequestlog, jm1_ai_risk_flag | Expansion governed per Sections 7–8 |
| 3 | Universal Workflow Engine | Orchestration layer | Shape supplied by Part B mechanics standard |
| 4 | **Enterprise Work Management** | Dataverse spine | Provides common concepts for ownership, stages, milestones, actions, dependencies, responsible party, target date, evidence, and status. Does **not** require every brand to store all work in one universal project table. The shared abstraction (project / case / engagement / matter / work item) requires a dedicated design decision before build — the jm1_title/jm1pub_title lesson applied in advance. Workload evaluation per Annex A.2. |
| 5 | Universal Client Portal | External Experience Layer (Azure + Next.js + Entra External ID); PROGRAM-002 = first tenant | **Blocked** for unified cross-entity data view pending Section 10.2 |
| 6 | Enterprise Document Intelligence | jm1_document + SharePoint document authority | Authority boundary already canon |
| 7 | Universal Approval System | Governance rules + Band system | Generalize templates from proven brand approvals |
| 8 | Enterprise Communications | Orchestration + licensed communication workloads per Annex A | Consolidation workload; Communications Dispatcher role (Section 6); **Communications Authority Matrix required** (Annex A.2) |
| 9 | Enterprise AI Workforce | Agent Workforce Layer | Planning census in Section 6 |
| 10 | Enterprise Knowledge Graph | Unified Relationship Layer (jm1_contact, jm1_relationship, consent model, identity keys) | Already canon architecturally; gap is population. Cross-pillar and AIC boundaries per 10.2 / 5.4 |
| 11 | **Enterprise Analytics Platform** | Governed analytical data layer + semantic models + Power BI reporting + observability standards | **Target physical architecture requires a separate future ADR** (operational vs. analytical reporting, Dataverse replication, Business Central integration, Fabric adoption, retention, semantic-model ownership, cross-pillar segmentation, historical snapshots). Power BI is the semantic/visualization layer, not the warehouse. |
| 12 | Enterprise Command Center | Reporting layer | Build workload post-sprint |
| 13 | Capability Catalog | Net-new — Section 4.1 | Register of record |

*(Commercialization removed from the capability list — see Section 4.3.)*

---

## 4. Net-New Governance Elements

### 4.1 Capability Catalog (Register of Record)

Filed under **00_SYSTEM / Registers**. **v0.1 core fields:** Capability ID/name; Capability Type (Core / Shared Service / Domain / Governance / Experience / Analytical); Definition; Business Outcome; Architecture Home; Pillar/Entity Boundary (Commercial Hub / Nonprofit Core / AIC / shared infrastructure); Lifecycle State (Proposed / Designed / Commissioning / Operational / Suspended / Retired); Promotion State (Brand-local / Candidate / Enterprise-shared / Commercialization candidate); Control Owner; Operational Owner; last_verified_date + evidence source; jm1_executionlog event types; Default Workload + Entitlement-First justification (Annex A linkage).

**v1.0 target additions:** Source of Truth; Data Classification (per Model Sovereignty Doctrine); Consuming Pipelines; Dependency Capabilities; Success Measures; Known Exceptions; Version; Supersession Link.

**Dimension rule:** lifecycle maturity, enterprise promotion, operational verification, and commercialization readiness are **separate fields answering different questions** and must never merge into one "maturity" value.

### 4.2 Capability Promotion Gate

Promotion from brand-local to enterprise-shared requires **all** of:

1. Production evidence in at least one brand (jm1_executionlog).
2. Current last_verified_date, evidence source, and named owner.
3. Human-First evaluation documented (client/family experience impact stated before system design).
4. Pillar/entity-boundary review passed where data crosses Nonprofit Core / Commercial Hub / AIC boundaries.
5. **Explicit Jackie approval.**

Model output is recommendation. Jackie approval creates canon. Logged execution creates operational truth.

### 4.3 Commercialization Readiness Layer (Not a Capability)

Commercialization is the downstream packaging and market application of proven capabilities — a release path, not a capability. A capability, pipeline template, agent package, or implementation framework may be evaluated for commercialization only when: it is enterprise-promoted; proven across **at least two materially different implementations**; documentation is complete; deployment dependencies are known; intellectual-property ownership is clear; external data and licensing restrictions are resolved; security and compliance posture are documented; and support/maintenance expectations are defined. Aligns with the Dual-Purpose Build Doctrine.

### 4.4 Entitlement-First Principle (Configure-Before-Customize)

> *Before approving custom automation, agents, applications, or code, JM1 must first determine whether an already licensed and architecturally authorized workload can meet the requirement through configuration, extension, or orchestration. The evaluation order is: use existing entitlement → configure → extend → orchestrate → custom-build only when justified. The justification is recorded in the Capability Catalog.*

**License-evaluated, not license-forced:** *Existing entitlement creates a mandatory evaluation, not a mandatory selection. The chosen workload must satisfy functional fit, experience (Human-First), governance, authority, security, data-boundary, cost, and maintainability criteria. A licensed product does not automatically win where it creates poor user experience, disproportionate administration, data-boundary concerns, inability to represent the business process accurately, disproportionate lock-in, or higher configure-and-maintain cost than a bounded custom solution.* Microsoft-First, not Microsoft-Only.

Agents and flows must respect the System Authority Model at all times: they orchestrate and stage within the authoritative system — **they never create parallel systems of record** (e.g., the Billing & Payments role stages transactions in Business Central; the Communications Dispatcher selects and renders approved templates but does not independently own canonical message content).

---

## 5. Part B — Enterprise Pipeline Standard

### 5.1 Required Mechanics (the standard)

Every governed lifecycle pipeline must define: entry criteria; stages; stage owners; required fields; permitted transitions; gate conditions; next-action discipline (**Stage / Next Action / Responsible Party / Target Date** on every active record); target dates; exception states; evidence requirements; jm1_executionlog events; reopening rules; cancellation/withdrawal behavior; and terminal or evergreen states. Guard conditions and loop prevention per Power Platform rules.

**Execution mode:** Each pipeline must identify its execution mode **for every stage**: manual, AI-assisted, flow-orchestrated, agent-executed, or hybrid. Manual and hybrid stages are legitimate commissioning states per the Manual-to-Governed Transition Doctrine. Any assigned automation or agent must define a human-review threshold.

**J0–J8 is the first certified reference implementation. The 0–8 numbering is optional.** Pipelines may use different stage counts, parallel lanes, recurring loops, sub-pipelines, and terminal or evergreen states, provided the mechanics above are defined.

### 5.2 Named Pipeline Instantiations

| Pipeline | Division | Shape (summary) | Status |
|---|---|---|---|
| J0–J8 | Publishing | Inquiry → … → Delivery | **COMMISSIONING IN PRODUCTION — certified reference implementation by proven stage.** Stage-level certification recorded in the Pipeline Register; blanket "operational" status is not claimed. |
| F0–F8 | Financial | F0 Inquiry → F1 Consultation → F2 Package/Engagement → F3 Intake → F4 Document Generation → F5 Legal/Boundary Review Gate → F6 Signing/Execution → F7 Funding/Implementation → F8 Annual Review (evergreen) | DRAFT — first post-sprint instantiation |
| G-PROG | Foundation | Program/Beneficiary lifecycle: intake → eligibility → delivery → outcome capture → impact reporting | DRAFT |
| G-DON | Foundation | Donor stewardship lifecycle: inquiry → qualification → campaign → donation → stewardship → impact communication | DRAFT |
| G-GRANT | Foundation | Grant opportunity & award lifecycle: scan → fit brief → application → award → compliance → reporting | DRAFT |
| A-pattern | AIC | Member-care lane + media lane, adopted as **patterns** under Section 5.4 boundary | EXPERIMENTAL — pilot via Media Ministry |
| P-pattern | Productions | Option → Development → Production → Distribution | REFERENCE ONLY until P3 revenue trigger |

The three Foundation pipelines share the Impact Measurement capability but are **not** forced into one state table or stage sequence.

### 5.3 F5 — Legal/Boundary Review Gate (JMF)

Every engagement must undergo rule-based boundary screening against the defined attorney-review criteria (including the 21 automatic risk flags). **Any attorney-review flag creates a non-bypassable hold** until the required attorney review or documented resolution is completed. **The screening gate is permanent; the attorney review applies when triggered.** Unflagged engagements proceed through the standard non-attorney document-preparation workflow. The JMF non-attorney boundary and client-facing language standard apply throughout F0–F8.

### 5.4 AIC Organizational Boundary

AIC is a separate ministry entity, not a JM1 brand workload. **AIC may adopt JM1-proven architectural patterns through an explicitly governed organizational boundary. AIC data authority, ministry governance, consent, and access remain separate from JM1 commercial operations.** The AIC media pipeline may reuse patterns; AIC member and care data does **not** automatically join a unified enterprise relationship graph. Nothing in this ADR implies JM1 ownership of AIC members, care data, or ministry records.

### 5.5 Pipeline Register (Register of Record)

Filed under **00_SYSTEM / Registers**. Holds stage-level certification truth. **Core fields:** Pipeline ID; Pipeline name; Entity/organization; Business owner; Operational owner; Pipeline lifecycle state; Architecture pillar; State authority/table; Entry criteria; Stage definitions; Execution mode per stage (5.1); **Current certified stages**; Stage certification evidence; Agent/flow assignments; Exception states; Last Verified; Related capabilities; Related canon; Version/supersession.

Publishing's J0–J8 seeds the first entry; its "certified by proven stage" status is expressed through the Current Certified Stages and evidence fields, not as a blanket status.

---

## 6. Part C — Agent Workforce Planning Census (Non-Binding Target State)

**Status rule:** An initial target-state **role census** is adopted for planning purposes. **Agent count is non-canonical** and may expand, contract, or consolidate based on workload evidence, control boundaries, cost, and operational performance. The roles are CANON-CANDIDATES; the numbers are not.

**Design principle:** Agents should normally align to **durable operational roles or bounded decision domains** rather than isolated prompts. **High-risk, deterministic, or tightly controlled activities may remain narrow tools, flows, functions, or task-specific agents** where that produces safer and more testable execution (e.g., royalty exception reports, metadata validation, payout-failure detection, defined document-package assembly).

**Runtime:** Copilot Studio is the **default candidate runtime** for suitable conversational and business-process agents; runtime selection is determined per agent based on interaction model, risk, control, integration, cost, and observability (Annex A).

**Fleet-state vocabulary:** Active / Commissioned / Planned / Reference-only / Retired. Planning census entries are **Planned** unless otherwise marked. Productions roles are **Reference-only and excluded from active workforce counts.**

### Tier 1 — Enterprise Core (Planned, 8 roles)

| Role | Function | Autonomy Ceiling |
|---|---|---|
| Intake Router | Universal front door; classify + route inquiries to brand pipelines (prototype: INT-PUB-005) | A3 |
| Scheduling Agent | core-scheduling-01 (Wave 1, spec'd); must state which scheduling lane it occupies (Annex A.2) | A3 |
| Communications Dispatcher | Selects and renders approved templates via licensed communication workloads; full logging; does not own canonical message content (Communications Authority Matrix, Annex A.2) | A3 |
| Document Assembly Agent | Template population from completed intake; [TO CONFIRM] marking; never invents facts | A2 |
| Billing & Payments Agent | Business Central + Stripe Connect invoicing, payout runs, reconciliation exception flags. High-risk deterministic sub-functions may be implemented as narrow flows/tools rather than one broad agent identity. | A2 → A3 after reconciliation proven |
| Compliance Screener | Brand risk-flag rulesets (JMF 21 flags, JMP contract flags). **Detection-only — may flag, never clear.** | A3 (detection) |
| Relationship Enrichment Agent | Contact-graph hygiene: dedup, role updates, consent state. Cross-brand signal detection gated by 10.2. | A2 (signals) / A3 (hygiene) |
| Reputation Agent | Review Hub / JM1-ReviewRouter workload | A3 |

### Tier 2 — Brand Specialists (Planned, 14–16 roles)

**Publishing (5):** pub-triage-01 (Wave 1); Editorial Pipeline Agent (stage progression with human gates; imprint decision remains Jackie's per canon); Metadata & Distribution Agent (A3); Marketing Agent (jm1-agent-pub-marketing-01, **CANON**, A2); Royalty Agent (A2 → A3).

**Financial (4):** fin-followup-01 Annual Review Agent (Wave 1, A3); Intake Interview Agent (structured package interviews, gap flagging, intake summary; generation always gated on Jackie confirmation — A2); Funding Follow-up Agent (A3); Signing/Execution Coordinator (checklist delivery, witness/notary readiness, attorney-flag routing — A2). **All JMF agents operate inside the non-attorney boundary; the F5 screening gate is permanent per 5.3. Tier 2 JMF agents do not advance beyond A2 without compliance and boundary review.**

**Foundation (3):** Grant Scout (scanning A3; application drafting A1); Donor Steward (A3); Impact Reporter (A3).

**AIC (2–3, subject to 5.4 boundary):** Media Pipeline Agent (mechanical steps A3; theological content review A2); Care Router (**routing only; care itself stays human** per the Human-First Operating Principle — A3); optional Volunteer Coordinator.

**Productions (2, Reference-only, excluded from counts):** Project Intake Agent; Production Tracker. Activation on P3 revenue trigger.

### Tier 3 — Meta Layer (4 roles)

| Role | Function | Authority Limit |
|---|---|---|
| **Sentinel** | Continuous watch on jm1_executionlog + jm1_airequestlog: failures, stalls, KPI violations, anomalies. Daily exception brief. **May invoke pre-commissioned safety suspension rules for defined critical events only. All other anomalies create a review case and recommendation. Changes to autonomy status require human approval and Registrar recording.** **Commissioning prerequisite:** the jm1_executionlog and jm1_airequestlog observability contracts (defined event types, normalized severity, correlation IDs, stage timing, failure-data completeness) must be sufficiently standardized for reliable detection. | A3 observe + pre-commissioned circuit breakers only |
| **Process Analyst** | Mines execution history for stalls, overrides, high-fire flags, repeated human corrections. Output: process-change proposals classified DRAFT/CANON-CANDIDATE — **never enacted directly.** | A1/A2 propose-only |
| **Agent Factory** | Drafts agent specifications, test cases, implementation handoffs, and **proposed** registry records. **Must not register any agent as commissioned or active.** | A2 draft-only |
| **Governance Registrar** | **Validates completeness, currency, provenance, and required approvals of governance records — including evidence references. Does not independently approve canon, autonomy promotion, or capability promotion.** Records decisions; does not originate them. Maintains Agent Registry, Capability Catalog, Pipeline Register. | A3 record-keeping |

---

## 7. Agent Classification — Three Separate Dimensions

**These dimensions must never be merged.**

**7.1 Lifecycle (maturity):** Proposed → Approved-to-Design → Specified → Built → Tested → Risk-Validated → Commissioned → Operational → Suspended → Retired.

**7.2 Autonomy:**

| Tier | Definition |
|---|---|
| **A0** | Observes, retrieves, classifies, or reports. No business-state mutation. |
| **A1** | Drafts or recommends. Human performs the action. |
| **A2** | Prepares or stages an action; **human approval is required before external communication, state transition, financial action, or other material effect.** |
| **A3** | Executes within explicitly commissioned scope without pre-approval; every material action logged to jm1_executionlog; exceptions escalate to human review. Requires a **current Registrar-validated evidence reference, approval record, and Last Verified date** (underlying evidence may live in execution logs, test artifacts, SharePoint, GitHub, Dataverse, or another governed authority). |
| **A4** | **Not authorized within JM1:** self-expanding or self-governing authority. Prohibited by the Hard Rule (Section 8). |

**7.3 Risk / Data Class:** per Model Sovereignty & Risk Doctrine tiers and data classification.

Example registry record: *Agent: Communications Dispatcher · Lifecycle: Commissioned · Autonomy: A2 · Risk Tier: 2 · Data Class: Internal + Limited Personal Data · Last Verified: 2026-07-14.*

### 7.4 Agent Autonomy Promotion Gate

Autonomy promotion (e.g., A2 → A3) is a distinct governance decision from capability promotion (4.2) and requires **all** of:

1. Lifecycle state at least **Risk-Validated**.
2. Explicit commissioned scope.
3. Test suite passed.
4. Failure and rollback behavior proven.
5. Material actions logged.
6. Exception routing validated.
7. Last Verified current.
8. Risk and data classification approved.
9. **Jackie or delegated-authority approval.**

**Demotion/suspension:** Sentinel may recommend demotion or trigger pre-commissioned circuit-breaker suspension; demotion or restoration requires Jackie or delegated human authority, recorded by the Registrar.

**Delegated authority (open decision, bounded by design):** Delegation, when designated, is **bounded — never blanket** — defined by severity, platform, agent, data class, action type, and duration through a future **Authority Matrix** (e.g., platform operator may pause a repeatedly failing flow; financial control authority may suspend payout execution; JMF boundary violations stop the affected agent pending Jackie/compliance review). The Authority Matrix is deferred as its own decision.

---

## 8. The Self-Improvement Loop (Governed)

**Observe** (Sentinel) → **Analyze** (Process Analyst) → **Propose** (DRAFT/CANON-CANDIDATE) → **Jackie approves** → **Design/Build/Test/Risk-Validate** (Factory spec → Chad/Cody build) → **Commissioning approval (Jackie)** → **Registry activation (Registrar, after evidence validation)** → **Production monitoring** → return to **Observe**.

New-agent lifecycle (mandatory sequence): Proposal → Approval to design → Specification → Build → Testing → Risk validation → **Commissioning approval** → Registry activation → Production monitoring. No step may be compressed or skipped.

**Hard Rule (proposed canon language):**

> *No agent may create, modify, expand, or promote the scope or authority of any agent, including itself. Agents may only draft proposals for such actions. Autonomy applies to execution within commissioned scope — never to scope itself. All scope changes require explicit Jackie (or bounded delegated human) approval and Registrar recording. Pre-commissioned circuit-breaker suspensions are the sole exception, are defined in advance by canon, and trigger mandatory human review.*

Anchor: **Models are replaceable. Governance is not.**

---

## 9. Sequencing

| Wave | Window | Content |
|---|---|---|
| 1 (spec'd) | Current | fin-followup-01, pub-triage-01, core-scheduling-01 |
| 1.5 | Post-Wave-1, **subject to scope freeze** | **Sentinel** — approved as observability capability; **prerequisite: standardized observability contracts per Section 6 Tier 3** |
| 2A | Post–Sept 6 | **Financial reference instantiation:** F0–F8 specification; JMF Annual Review Agent; only the communications and screening components F0–F8 strictly requires |
| 2B | Gated on 2A evidence | **First shared-capability promotion:** promote the first genuinely reusable component from Publishing or Financial; prove it across two materially different implementations (creates the commercialization evidence required by 4.3) |
| 2C | Gated on 2B | **Foundation pilot:** donor stewardship (G-DON) **or** grant pipeline (G-GRANT) — one, not both initially |
| 3 | Year one | Grow fleet per evidence (planning reference ~12–15); Governance Registrar; Capability Catalog population; Command Center v1; Enterprise Analytics Platform ADR; Communications Authority Matrix |
| 4 | 24–36 months | Process Analyst, Agent Factory; census steady state per evidence (planning reference ~28–32, non-canonical); commercialization evidence review per 4.3 |

Nothing in Waves 1.5+ touches JM1-SPRINT-90-001 deliverables. **This ADR authorizes no production implementation; each build requires its own approval.**

---

## 10. Governance Considerations & Risks

**10.1 Approval throughput.** Jackie is sole approval authority; the scaling constraint is decisions-requiring-Jackie, not agent count. Mitigation: A-tier design pushes repeatable bounded execution to commissioned A3 with logged evidence; Jackie's attention concentrates on commissioning, scope changes, and gate-class decisions. Bounded delegated authority per 7.4 remains an open Authority Matrix decision.

**10.2 Pillar/entity boundary (open dependency).** Capabilities 5, 10 (cross-brand signals), and 11 involve data crossing Nonprofit Core / Commercial Hub / AIC boundaries. **Blocked** pending: security-role architecture on the Unified Relationship Layer consent model; Azure subscription governance open actions (tagging, asset migration, cost alerts) closed; AIC boundary terms per 5.4. Unified identity may proceed; unified cross-entity data views may not.

**10.3 JMF exposure.** AI handling of client legal documents runs only inside the Agent Trust & Control Fabric with human-review thresholds, full jm1_airequestlog auditing, and the permanent F5 screening gate (5.3). No agent output is client-final without the governed review path. **Tier 2 JMF agents remain capped at A2 pending compliance and boundary review.**

**10.4 Table ownership.** Each new pipeline and the Enterprise Work Management abstraction require explicit Dataverse table-ownership decisions (publisher prefix, environment, solution) before build.

**10.5 Human-First.** Every agent spec states client/family experience impact before system design. Care, ministry, and judgment stay human; agents route, draft, and execute the mechanical.

**10.6 Risk summary (Auditor view).** Highest severity: unauthorized automation via Meta Layer (mitigated: Hard Rule, circuit-breaker pre-commissioning, nine-step lifecycle) and cross-pillar/AIC data exposure (mitigated: 10.2 block, 5.4 boundary). Medium: template-authority overlap across communication workloads (mitigated: Communications Authority Matrix dependency); broad-agent over-concentration in Billing & Payments (mitigated: narrow-tool carve-out). All agents: hallucination risk mitigated by template-driven outputs, [TO CONFIRM] marking, verifiable-outcome design.

---

## 11. Handoff — ChatGPT/Chad (Document Production & Register Schemas — Spec-Only)

- **Objective:** Produce the formatted **ADR-JM1-V3-EXT-001 v0.4**; produce the separate canon standard draft ("JM1 Enterprise Capability & Pipeline Standard v1.0"); produce **schema proposals and seeded register templates** for the Capability Catalog, Pipeline Register (5.5), and Agent Registry v2.
- **Scope limit:** Immediate outputs are **schema proposals, seeded templates, or repository-based draft registers only — not JM1-Core tables or production systems** (sprint freeze).
- **Inputs:** **This ADR v0.4**; JM1-CANON-CERT-001; Sprint doc v1.2; Model Sovereignty & Risk Doctrine v1.0; Manual-to-Governed Transition Doctrine v1.0; existing Agent Registry; Council audits #1 (17 conditions) and #2 (21 conditions); revision trace (Annex B).
- **Assumptions:** Filing per header (ADR library / Canon-Artifacts / Registers as three distinct artifact classes); naming per JM1 conventions.
- **Dependencies:** Jackie approval of this ADR; 10.2 items remain open, non-blocking for spec-only work.
- **Execution sequence:** (1) Format **ADR v0.4** → ADR library as draft; (2) Capability Catalog schema + 13-row seed; (3) Pipeline Register schema per 5.5 with stage-certification fields, J0–J8 seeded; (4) Agent Registry v2 schema with three-dimension classification (Lifecycle / Autonomy A0–A4 / Risk-Data class) + Last Verified fields; (5) validate Annex A against the actual tenant entitlement (confirm licensed workloads, installed apps, capacity — including Field Service install status, Journeys, Digital Messaging/Voice, Customer Voice, Copilot Studio capacity, ACS provisioning, Entra External ID, Power BI licensing, Foundry/AOAI consumption authority) and populate the Annex A status fields with evidence; (6) return to Jackie for approval.
- **Required approvals:** Jackie — ADR acceptance; Jackie — canon standard promotion; Jackie — register schemas; Jackie — Annex A authoritative status (post-validation).
- **Validation checks:** **Agent Registry schema must require A3 evidence fields. Any future implementation must prevent A3 activation when required evidence, approval, or Last Verified fields are absent** (enforcement mechanism — Dataverse business rule, flow validation, or governance review — selected at build time, not asserted now). Catalog rows carry separate lifecycle/promotion/verification/commercialization state fields. ADR cross-references resolve to existing canon IDs.
- **Risks:** Duplication with existing capability tracking — reconcile before creating a second register; register bloat at v0.1 — core fields first per 4.1.
- **Expected output:** **ADR v0.4** (Accepted-ready); canon standard draft v1.0; three register schema/template proposals; validated Annex A.
- **jm1_executionlog relevance:** Log ADR acceptance, canon promotion, register-schema approval, and Annex A validation as governance events.

---

## Annex A — Licensed Platform & Workload Map (CANDIDATE — Pending Tenant Validation)

**Status:** Annex A is the **candidate** Licensed Platform & Workload Map, pending tenant-entitlement and installed-app validation (handoff step 5). **Upon validation and Jackie approval, it becomes the authoritative default workload map**, maintained through the Capability Catalog. Assignments are design defaults under the Entitlement-First principle (4.4), not build authorizations; final workload selection per capability is confirmed at build time with Jackie approval. The System Authority Model of the certified architecture governs throughout.

### A.1 Platform Inventory

| Platform / Workload | Class | Role in Architecture | Entitlement / Install Status | Verified / Evidence |
|---|---|---|---|---|
| Dataverse | Data Platform | **Default operational state authority for governed pipelines and execution records.** Register authority is determined per register design; repository artifacts may remain the canon document authority while Dataverse provides operational indexing or enforcement. | Licensed, in production (JM1-Core) | To validate |
| Dynamics 365 Sales Enterprise | Business Application | Acquisition engine (per certified architecture): leads, opportunities, qualification. In production use: INT-PUB-005 writes D365 Leads. | Licensed per Jackie statement; installed | To validate |
| Dynamics 365 Customer Service (incl. Digital Messaging & Voice) | Business Application | Case/engagement service management; omnichannel inbound (chat, SMS, voice). Candidate authority for service cases, escalations, exception-review queues. | Licensed per Jackie statement; install/capacity unverified | To validate |
| Dynamics 365 Field Service | Business Application | Scheduling, work orders, resource management. Prior session indicates install initiated in JM1-Core — status unconfirmed. | Licensed per Jackie statement; install status unverified | To validate |
| Dynamics 365 Customer Voice | Business Application | Candidate survey and experience-measurement workload. | Licensed per Jackie statement; capacity unverified | To validate |
| Dynamics 365 Customer Insights – Journeys (Marketing) | Business Application | Outbound journeys, segments, campaign orchestration, consent-aware marketing communications. | Licensed per Jackie statement; install/capacity unverified | To validate |
| Power Apps | Business Application | Interfaces: model-driven admin apps, intake forms (author marketing intake already decided as Power Apps), canvas apps | Licensed; in production | To validate |
| Power Automate | Business Application | Orchestration layer; flow-based automation and approvals | Licensed; in production | To validate |
| Copilot Studio | AI Runtime | **Default candidate runtime** for suitable conversational and business-process agents. Runtime selection is per agent (interaction model, risk, control, integration, cost, observability); agents may alternatively run via Foundry agent services, custom Azure applications, Power Automate, or deterministic services. | Capacity unverified | To validate |
| Azure AI Foundry / Azure OpenAI Service | AI Runtime / Cloud Service | Governed model management and AI-service capabilities | Consumption authority unverified | To validate |
| Azure Communication Services | Cloud Service | **Candidate** programmatic communications rail for approved SMS, voice, and email scenarios. Number provisioning, Teams interoperability, brand identity, consent, and regulatory requirements must be verified per channel before use. | Provisioning unverified | To validate |
| Business Central | Business Application | **Financial authority — sole ledger.** Agents stage; BC records. | Licensed; system of record (QBO retirement in progress) | To validate |
| SharePoint | Productivity Surface | **Governed enterprise document authority.** | Licensed; in production | To validate |
| OneDrive | Productivity Surface | Individual work-in-progress and synchronization surface; **not an authoritative enterprise repository unless explicitly designated.** | Licensed; in production | To validate |
| Power BI | Data Platform | Semantic models and reporting (visualization layer of Capability 11) | Licensing tier unverified | To validate |
| Microsoft 365 (Outlook, Teams, Bookings) | Productivity Surface | Communications and scheduling surfaces | Licensed; in production | To validate |
| Entra External ID + Next.js on Azure | Cloud Service / Development Platform | External Experience Layer (portals); PROGRAM-002 pattern; Power Pages remains rejected per prior decision | External ID configuration unverified | To validate |
| GitHub + Codex workflows | Development Platform | Code lifecycle | Organizational account; not a licensed business workload in the entitlement sense | To validate |
| Planning Center | Ministry System (External) | **AIC ministry authority — outside the JM1 commercial graph per Section 5.4.** Separate organizational entitlement. | AIC entitlement; separate entity | To validate |

### A.2 Default Capability-to-Workload Assignments

| Capability | Default Licensed Workload(s) | Custom-Build Residual |
|---|---|---|
| 1 Universal Intake Engine | Sales Enterprise (lead/opportunity) + Power Apps forms + Power Automate routing | Web intake endpoints (proven: INT-PUB-005 pattern) |
| 2 Universal AI Router | Copilot Studio (default candidate) + Foundry/AOAI under the Trust & Control Fabric | Router logic, confidence routing, jm1_airequestlog writes |
| 3 Universal Workflow Engine | Power Automate + Dataverse state tables | Pipeline-mechanics templates (5.1) |
| 4 Enterprise Work Management | **Evaluate the native case, opportunity, project, work-order, activity, and scheduling models relevant to each domain before defining a shared abstraction. No single licensed workload is presumed to be the universal work model.** | Only if licensed work models fail the abstraction decision (Section 3, #4) |
| 5 Universal Client Portal | Entra External ID + Next.js (PROGRAM-002 pattern) | Portal application code |
| 6 Document Intelligence | SharePoint authority + jm1_document + AI Builder/Foundry extraction | Review-package assembly |
| 7 Universal Approval System | Power Automate Approvals + Dataverse status models | Band-system guard conditions |
| 8 Enterprise Communications | Customer Insights–Journeys (outbound journeys, consent) + Customer Service Digital Messaging/Voice (inbound omnichannel) + ACS (candidate) + Outlook/Teams. **Dependency: a Communications Authority Matrix must define template ownership by communication class (marketing, transactional, operational, service, appointment, legal/compliance, agent-generated). The Dispatcher selects and renders approved templates; it does not independently own canonical message content.** | Dispatcher orchestration only |
| 9 Enterprise AI Workforce | Copilot Studio (default candidate runtime) + Foundry/AOAI (models) + Dataverse (registry/logs) | Agent specifications per Section 6 |
| 10 Knowledge Graph | Dataverse Unified Relationship Layer (jm1_contact/jm1_relationship/consent) | Enrichment logic (10.2-gated) |
| 11 Enterprise Analytics Platform | Power BI semantic/reporting now; physical store deferred to the dedicated future ADR (Fabric/Lakehouse candidates) | None until that ADR |
| 12 Command Center | Power BI | Dashboard build |
| 13 Capability Catalog | Repository template now; register authority determined per register design post-freeze | Schema only in this pass |
| Surveys / Success Measures (cross-cutting) | **Customer Voice approved as the default enterprise evaluation target for structured experience measurement. An existing Forms design is not superseded until a short functional-fit comparison (licensing/capacity, branding, anonymous vs. authenticated, distribution, Dataverse mapping, response ownership, recipient experience, reporting, retention, implementation status) confirms migration value with no delivery disruption.** | Survey-to-Dataverse mapping |
| Scheduling (cross-cutting) | Bookings (client self-service) + Field Service (resource/work-order, pending install verification) — core-scheduling-01 must state which lane it occupies | Reminder/sync flows (existing) |

### A.3 Annex Governance

- Annex A is maintained as part of the Capability Catalog (fields: Default Workload, Custom-Build Residual, Entitlement-First justification, Entitlement/Install Status, Verified Date, Evidence).
- Any capability or agent spec that departs from its default workload must record the justification before build approval.
- Licensing changes (added/retired workloads) trigger an Annex A review, logged as a governance event.
- Pillar note: licensed workloads deployed for Foundation/AIC purposes respect the Nonprofit Core boundary and Section 5.4; **a shared license does not create shared data.**

---

## Annex B — Revision Trace (Council Audits)

Full audits are archived with the Council records; this trace maps conditions to resolutions.

**Audit #1 (Chad, July 14, 2026 — 17 conditions → v0.2):**

| Condition (summary) | Resolution |
|---|---|
| "Ratified" → "recognized capability map"; readiness separated from mapping | §§1–3 |
| Commercialization removed as a capability | §4.3 |
| Data Warehouse → Enterprise Analytics Platform; future ADR | §3 #11 |
| Project Management → Enterprise Work Management; abstraction decision | §3 #4 |
| J0–J8 reference pattern, stage count optional | §5.1 |
| Publishing status → Commissioning in Production, stage-certified | §5.2 |
| Agent count non-canonical | §§2, 6 |
| Lifecycle / autonomy / risk separated; A0 + prohibited A4 | §7 |
| A2 wording (prepare/stage; approval before material effect) | §7.2 |
| Sentinel limited to pre-commissioned circuit breakers | §§6, 7.4, 8 |
| Factory/Registrar authority bounded | §6 Tier 3, §8 |
| F5 screening-gate clarification | §5.3 |
| Foundation split G-PROG / G-DON / G-GRANT | §5.2 |
| AIC entity boundary | §5.4 |
| Catalog/registry work = schema-only | §11 |
| Architecture baseline resolved to JM1-CANON-CERT-001 | Header |
| Expanded Catalog fields (phased) | §4.1 |

**Audit #2 (Chad, July 14, 2026 — 21 conditions → v0.4):**

| Condition (summary) | Resolution |
|---|---|
| Section 11 version references corrected | §11 |
| Revision trace added | Annex B |
| V3 token annotated as historical identifier | Header |
| Buy-Before-Build → Entitlement-First / Configure-Before-Customize | §4.4 |
| License-evaluated, not license-forced | §4.4 |
| Annex A marked candidate pending tenant validation | Annex A status |
| Entitlement/install/verified/evidence fields + Platform Class added | A.1 |
| Dataverse authority wording (per-register design) | A.1 |
| SharePoint authority separated from OneDrive working surface | A.1 |
| Unverified ACS number assertion removed | A.1 |
| Copilot Studio = default candidate runtime, per-agent selection | §6, A.1 |
| Work Management evaluation broadened beyond Field Service | A.2 #4 |
| Communications Authority Matrix dependency | A.2 #8, §3 #8, §9 Wave 3 |
| Customer Voice = fit-assessment target; Forms not superseded yet | A.2 |
| Pipeline Register core fields defined | §5.5 |
| Execution mode per stage; manual/hybrid legitimate | §5.1 |
| Separate Agent Autonomy Promotion Gate | §7.4 |
| Registrar-validated evidence references (not Registrar-held) | §7.2, §6 Tier 3 |
| Delegated authority bounded by severity/domain; Authority Matrix deferred | §7.4 |
| Wave 2 split into 2A / 2B / 2C gated increments | §9 |
| Standardized telemetry prerequisite for Sentinel | §6 Tier 3, §9 |

---

## 12. Decision Record (Final — per Council audit #2)

| Decision | Recommended Final Status |
|---|---|
| Recognize the Enterprise Capability Map | **APPROVE** |
| Establish Capability Catalog and Promotion Gate | **APPROVE** |
| Establish Pipeline Register and stage-certification model | **APPROVE** |
| Adopt Enterprise Pipeline mechanics | **APPROVE** |
| Recognize J0–J8 as first commissioning reference implementation | **APPROVE** |
| Adopt planning-level Agent Workforce role census | **APPROVE — NON-BINDING** |
| Adopt A0–A4 autonomy framework | **APPROVE WITH SEPARATE AGENT PROMOTION GATE** (included: §7.4) |
| Adopt governed self-improvement loop | **APPROVE** |
| Adopt Entitlement-First principle | **APPROVE WITH "LICENSE-EVALUATED, NOT LICENSE-FORCED" CLARIFICATION** (applied: §4.4) |
| Adopt Annex A as authoritative workload map | **CONDITIONAL — AFTER TENANT VALIDATION** |
| Make Customer Voice the enterprise survey default | **APPROVE FOR FIT ASSESSMENT; DO NOT YET SUPERSEDE FORMS** |
| Designate delegated suspension authority | **DEFER TO AUTHORITY-MATRIX DECISION** |
| Begin production implementation | **NOT AUTHORIZED** |
| *(Retained by Architect for decision-record visibility)* Cross-pillar unified data views | **REMAINS BLOCKED** (10.2) |
| *(Retained by Architect for decision-record visibility)* Tier 2 JMF agents beyond A2 | **NOT APPROVED — compliance and boundary review required** (10.3) |

**Approval line:** ____________________ Jackie, J Merrill One — Date: __________

*Draft — For Review. Model output is recommendation. Jackie approval creates canon. Logged execution creates operational truth.*
