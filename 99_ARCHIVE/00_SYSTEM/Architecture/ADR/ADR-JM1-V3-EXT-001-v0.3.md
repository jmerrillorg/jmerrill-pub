---
Status: Superseded
Superseded By: ADR-JM1-V3-EXT-001 v0.4
Superseded Date: 2026-07-14
Archive Source: /Volumes/UsersExternal/_INBOX/260715/ADR_JM1_V3_EXT_001_v0.3_Capability_Pipeline_Agent_Workforce.md
---
# ADR — JM1 Enterprise Capability Map, Pipeline Standard & Agent Workforce Extension

| Field | Value |
|---|---|
| **ADR ID** | ADR-JM1-V3-EXT-001 |
| **Version** | v0.3 — v0.2 incorporated AI Council review (Chad audit, July 14, 2026; 17 revision conditions applied); v0.3 adds the License-First principle (4.4) and Annex A Licensed Platform & Workload Map per Jackie directive, July 14, 2026 |
| **Status** | **CANON-CANDIDATE — Requires Jackie Approval** |
| **Classification** | Spec-only. No JM1-Core changes. Sprint-safe under JM1-SPRINT-90-001 scope freeze. This ADR does not authorize production implementation. |
| **Author** | Claude (Architect), JM1 AI Council; audited by Chad (Builder) |
| **Approval Authority** | Jackie (sole) |
| **Date** | July 14, 2026 |
| **Filing** | Draft: 00_SYSTEM / Architecture / ADR. Upon approval: ADR remains in ADR library with status Accepted; a separate canon standard ("JM1 Enterprise Capability & Pipeline Standard v1.0") is produced for 00_SYSTEM / Canon-Artifacts; register entries created in 00_SYSTEM / Registers. |
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

**Part A — Enterprise Capability Map.** The thirteen capability areas in Section 3 are **recognized as the initial JM1 Enterprise Capability Map**. Inclusion in the map does **not** certify operational readiness. Each capability retains independent maturity, evidence, ownership, and promotion state in the Capability Catalog. Two net-new governance elements are added: the Capability Catalog and the Capability Promotion Gate (Section 4). Commercialization is defined separately as a readiness layer, not a capability (Section 4.3).

**Part B — Enterprise Pipeline Standard.** The required *mechanics* of a governed lifecycle pipeline are adopted (Section 5). J0–J8 is the first certified reference implementation; its nine-stage numbering is **optional**, not mandatory.

**Part C — Agent Workforce Planning Census.** A three-tier, role-oriented census is adopted **for planning purposes only**. The roles are canon-candidates; **the agent count is non-canonical** and may expand, contract, or consolidate based on workload evidence, control boundaries, cost, and operational performance (Section 6). The autonomy framework (Section 7), governed self-improvement loop, and authority boundaries (Section 8) are adopted subject to the constraints stated there.

---

## 3. Part A — Enterprise Capability Map (Recognized, Not Certified)

Each capability is a workload of a layer already ratified under JM1-CANON-CERT-001. No new architecture is created by this section. Lifecycle and promotion states live in the Capability Catalog, not in this table.

| # | Capability | Architecture Home | Notes |
|---|---|---|---|
| 1 | Universal Intake Engine | Orchestration layer (Power Automate) + Dataverse spine | Proving implementation: INT-PUB-005 |
| 2 | Universal AI Router | Agent Workforce Layer + Agent Trust & Control Fabric; jm1_airequestlog, jm1_ai_risk_flag | Expansion governed per Sections 7–8 |
| 3 | Universal Workflow Engine | Orchestration layer | Shape supplied by Part B mechanics standard |
| 4 | **Enterprise Work Management** | Dataverse spine | Provides common concepts for ownership, stages, milestones, actions, dependencies, responsible party, target date, evidence, and status. Does **not** require every brand to store all work in one universal project table. The shared abstraction (project / case / engagement / matter / work item) requires a dedicated design decision before build — the jm1_title/jm1pub_title lesson applied in advance. |
| 5 | Universal Client Portal | External Experience Layer (Azure + Next.js + Entra External ID); PROGRAM-002 = first tenant | **Blocked** for unified cross-entity data view pending Section 10.2 |
| 6 | Enterprise Document Intelligence | jm1_document + SharePoint document authority | Authority boundary already canon |
| 7 | Universal Approval System | Governance rules + Band system | Generalize templates from proven brand approvals |
| 8 | Enterprise Communications | Orchestration + ACS/Teams/Outlook | Consolidation workload; Communications Dispatcher role (Section 6) |
| 9 | Enterprise AI Workforce | Agent Workforce Layer | Planning census in Section 6 |
| 10 | Enterprise Knowledge Graph | Unified Relationship Layer (jm1_contact, jm1_relationship, consent model, identity keys) | Already canon architecturally; gap is population. Cross-pillar and AIC boundaries per 10.2 / 5.4 |
| 11 | **Enterprise Analytics Platform** | Governed analytical data layer + semantic models + Power BI reporting + observability standards | **Target physical architecture requires a separate future ADR** (operational vs. analytical reporting, Dataverse replication, Business Central integration, Fabric adoption, retention, semantic-model ownership, cross-pillar segmentation, historical snapshots). Power BI is the semantic/visualization layer, not the warehouse. Current reporting may use operational-source and semantic-model patterns. |
| 12 | Enterprise Command Center | Reporting layer | Build workload post-sprint |
| 13 | Capability Catalog | Net-new — Section 4.1 | Register of record |

*(Commercialization removed from the capability list — see Section 4.3.)*

---

## 4. Net-New Governance Elements

### 4.1 Capability Catalog (Register of Record)

Filed under **00_SYSTEM / Registers**. **v0.1 core fields:** Capability ID/name; Capability Type (Core / Shared Service / Domain / Governance / Experience / Analytical); Definition; Business Outcome; Architecture Home; Pillar/Entity Boundary (Commercial Hub / Nonprofit Core / AIC / shared infrastructure); Lifecycle State (Proposed / Designed / Commissioning / Operational / Suspended / Retired); Promotion State (Brand-local / Candidate / Enterprise-shared / Commercialization candidate); Control Owner; Operational Owner; last_verified_date + evidence source; jm1_executionlog event types.

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

### 4.4 License-First Principle (Buy-Before-Build)

> *Before any capability, pipeline stage, or agent is commissioned as a custom build, the design must first verify whether a licensed first-party application in the JM1 entitlement already provides the function. Custom builds (flows, agents, code) are justified only where the licensed workload cannot meet the requirement, where governance demands it, or where the Human-First evaluation favors it. The justification is recorded in the Capability Catalog.*

The authoritative inventory of licensed workloads and their default capability assignments is **Annex A**. Agents and flows must respect the System Authority Model at all times: they orchestrate and stage within the authoritative system — they never create parallel systems of record (e.g., the Billing & Payments role stages transactions in Business Central; the Communications Dispatcher orchestrates through Customer Insights–Journeys/ACS rather than maintaining shadow template engines).

---

## 5. Part B — Enterprise Pipeline Standard

### 5.1 Required Mechanics (the standard)

Every governed lifecycle pipeline must define: entry criteria; stages; stage owners; required fields; permitted transitions; gate conditions; next-action discipline (**Stage / Next Action / Responsible Party / Target Date** on every active record); target dates; exception states; evidence requirements; jm1_executionlog events; reopening rules; cancellation/withdrawal behavior; and terminal or evergreen states. Guard conditions and loop prevention per Power Platform rules. At least one assigned agent or flow with a defined human-review threshold.

**J0–J8 is the first certified reference implementation. The 0–8 numbering is optional.** Pipelines may use different stage counts, parallel lanes, recurring loops, sub-pipelines, and terminal or evergreen states, provided the mechanics above are defined.

### 5.2 Named Pipeline Instantiations

| Pipeline | Division | Shape (summary) | Status |
|---|---|---|---|
| J0–J8 | Publishing | Inquiry → … → Delivery | **COMMISSIONING IN PRODUCTION — certified reference implementation by proven stage.** Stage-level certification state recorded in the Pipeline Register; blanket "operational" status is not claimed. |
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

---

## 6. Part C — Agent Workforce Planning Census (Non-Binding Target State)

**Status rule:** An initial target-state **role census** is adopted for planning purposes. **Agent count is non-canonical** and may expand, contract, or consolidate based on workload evidence, control boundaries, cost, and operational performance. The roles are CANON-CANDIDATES; the numbers are not.

**Design principle:** Agents should normally align to **durable operational roles or bounded decision domains** rather than isolated prompts. **High-risk, deterministic, or tightly controlled activities may remain narrow tools, flows, functions, or task-specific agents** where that produces safer and more testable execution (e.g., royalty exception reports, metadata validation, payout-failure detection, defined document-package assembly).

**Fleet-state vocabulary:** Active / Commissioned / Planned / Reference-only / Retired. Planning census entries are **Planned** unless otherwise marked. Productions roles are **Reference-only and excluded from active workforce counts.**

### Tier 1 — Enterprise Core (Planned, 8 roles)

| Role | Function | Autonomy Ceiling |
|---|---|---|
| Intake Router | Universal front door; classify + route inquiries to brand pipelines (prototype: INT-PUB-005) | A3 |
| Scheduling Agent | core-scheduling-01 (Wave 1, spec'd) | A3 |
| Communications Dispatcher | Templated outbound, brand-keyed template library, full logging | A3 |
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
| **Sentinel** | Continuous watch on jm1_executionlog + jm1_airequestlog: failures, stalls, KPI violations, anomalies. Daily exception brief. **May invoke pre-commissioned safety suspension rules for defined critical events only. All other anomalies create a review case and recommendation. Changes to autonomy status require human approval and Registrar recording.** | A3 observe + pre-commissioned circuit breakers only |
| **Process Analyst** | Mines execution history for stalls, overrides, high-fire flags, repeated human corrections. Output: process-change proposals classified DRAFT/CANON-CANDIDATE — **never enacted directly.** | A1/A2 propose-only |
| **Agent Factory** | Drafts agent specifications, test cases, implementation handoffs, and **proposed** registry records. **Must not register any agent as commissioned or active.** | A2 draft-only |
| **Governance Registrar** | **Validates completeness, currency, provenance, and required approvals of governance records. Does not independently approve canon, autonomy promotion, or capability promotion.** Records decisions; does not originate them. Maintains Agent Registry, Capability Catalog, Last Verified evidence. | A3 record-keeping |

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
| **A3** | Executes within explicitly commissioned scope without pre-approval; every material action logged to jm1_executionlog; exceptions escalate to human review. Requires Registrar-held current Last Verified evidence. |
| **A4** | **Not authorized within JM1:** self-expanding or self-governing authority. Prohibited by the Hard Rule (Section 8). |

**7.3 Risk / Data Class:** per Model Sovereignty & Risk Doctrine tiers and data classification.

Example registry record: *Agent: Communications Dispatcher · Lifecycle: Commissioned · Autonomy: A2 · Risk Tier: 2 · Data Class: Internal + Limited Personal Data · Last Verified: 2026-07-14.*

**Autonomy changes:** promotion follows the Promotion Gate (4.2). Sentinel may recommend demotion or trigger pre-commissioned circuit-breaker suspension; **demotion or restoration requires Jackie or delegated human authority**, recorded by the Registrar. *(Open question for Jackie: designate delegated suspension authority for periods when Jackie is unavailable — currently undefined.)*

---

## 8. The Self-Improvement Loop (Governed)

**Observe** (Sentinel) → **Analyze** (Process Analyst) → **Propose** (DRAFT/CANON-CANDIDATE) → **Jackie approves** → **Design/Build/Test/Risk-Validate** (Factory spec → Chad/Cody build) → **Commissioning approval (Jackie)** → **Registry activation (Registrar, after evidence)** → **Production monitoring** → return to **Observe**.

New-agent lifecycle (mandatory sequence): Proposal → Approval to design → Specification → Build → Testing → Risk validation → **Commissioning approval** → Registry activation → Production monitoring. No step may be compressed or skipped.

**Hard Rule (proposed canon language):**

> *No agent may create, modify, expand, or promote the scope or authority of any agent, including itself. Agents may only draft proposals for such actions. Autonomy applies to execution within commissioned scope — never to scope itself. All scope changes require explicit Jackie (or delegated human) approval and Registrar recording. Pre-commissioned circuit-breaker suspensions are the sole exception, are defined in advance by canon, and trigger mandatory human review.*

Anchor: **Models are replaceable. Governance is not.**

---

## 9. Sequencing

| Wave | Window | Content |
|---|---|---|
| 1 (spec'd) | Current | fin-followup-01, pub-triage-01, core-scheduling-01 |
| 1.5 | Post-Wave-1, **subject to scope freeze** | **Sentinel** — approved as observability capability; the fleet cannot safely scale unobserved |
| 2 | Post–Sept 6 | F0–F8 instantiation; Enterprise Core buildout (Intake Router, Communications Dispatcher, Compliance Screener, Document Assembly); starting trio: JMF Annual Review, JMP Metadata, Foundation Donor Steward |
| 3 | Year one | Grow fleet per evidence (planning reference ~12–15); Governance Registrar; Capability Catalog population; Command Center v1; Enterprise Analytics Platform ADR |
| 4 | 24–36 months | Process Analyst, Agent Factory; census steady state per evidence (planning reference ~28–32, non-canonical); commercialization evidence review per 4.3 |

Nothing in Waves 1.5+ touches JM1-SPRINT-90-001 deliverables. **This ADR authorizes no production implementation; each build requires its own approval.**

---

## 10. Governance Considerations & Risks

**10.1 Approval throughput.** Jackie is sole approval authority; the scaling constraint is decisions-requiring-Jackie, not agent count. Mitigation: A-tier design pushes repeatable bounded execution to commissioned A3 with logged evidence; Jackie's attention concentrates on commissioning, scope changes, and gate-class decisions. Delegated suspension authority is an open decision (Section 7.3).

**10.2 Pillar/entity boundary (open dependency).** Capabilities 5, 10 (cross-brand signals), and 11 involve data crossing Nonprofit Core / Commercial Hub / AIC boundaries. **Blocked** pending: security-role architecture on the Unified Relationship Layer consent model; Azure subscription governance open actions (tagging, asset migration, cost alerts) closed; AIC boundary terms per 5.4. Unified identity may proceed; unified cross-entity data views may not.

**10.3 JMF exposure.** AI handling of client legal documents runs only inside the Agent Trust & Control Fabric with human-review thresholds, full jm1_airequestlog auditing, and the permanent F5 screening gate (5.3). No agent output is client-final without the governed review path. **Tier 2 JMF agents remain capped at A2 pending compliance and boundary review.**

**10.4 Table ownership.** Each new pipeline and the Enterprise Work Management abstraction require explicit Dataverse table-ownership decisions (publisher prefix, environment, solution) before build.

**10.5 Human-First.** Every agent spec states client/family experience impact before system design. Care, ministry, and judgment stay human; agents route, draft, and execute the mechanical.

**10.6 Risk summary (Auditor view).** Highest severity: unauthorized automation via Meta Layer (mitigated: Hard Rule, circuit-breaker pre-commissioning, nine-step lifecycle) and cross-pillar/AIC data exposure (mitigated: 10.2 block, 5.4 boundary). Medium: role confusion between Communications Dispatcher and brand marketing agents (mitigated: template-library ownership rules); broad-agent over-concentration in Billing & Payments (mitigated: narrow-tool carve-out in Section 6 design principle). All agents: hallucination risk mitigated by template-driven outputs, [TO CONFIRM] marking, verifiable-outcome design.

---

## 11. Handoff — ChatGPT/Chad (Document Production & Register Schemas — Spec-Only)

- **Objective:** Produce the formatted ADR v0.2; produce the separate canon standard draft ("JM1 Enterprise Capability & Pipeline Standard v1.0"); produce **schema proposals and seeded register templates** for the Capability Catalog, Pipeline Register, and Agent Registry v2.
- **Scope limit:** Immediate outputs are **schema proposals, seeded templates, or repository-based draft registers only — not JM1-Core tables or production systems** (sprint freeze).
- **Inputs:** This ADR v0.2; JM1-CANON-CERT-001; Sprint doc v1.2; Model Sovereignty & Risk Doctrine v1.0; Manual-to-Governed Transition Doctrine v1.0; existing Agent Registry; Chad audit (17 conditions).
- **Assumptions:** Filing per Section header (ADR library / Canon-Artifacts / Registers as three distinct artifact classes); naming per JM1 conventions.
- **Dependencies:** Jackie approval of this ADR; 10.2 items remain open, non-blocking for spec-only work.
- **Execution sequence:** (1) Format ADR → ADR library as draft; (2) Capability Catalog schema + 13-row seed; (3) Pipeline Register schema with stage-certification fields; (4) Agent Registry v2 schema with three-dimension classification (Lifecycle / Autonomy A0–A4 / Risk-Data class) + Last Verified fields; (5) validate Annex A against the actual tenant entitlement (confirm licensed workloads, seats, and installed apps — Field Service install status included) and flag discrepancies; (6) return to Jackie for approval.
- **Required approvals:** Jackie — ADR acceptance; Jackie — canon standard promotion; Jackie — register schemas.
- **Validation checks:** **Agent Registry schema must require A3 evidence fields. Any future implementation must prevent A3 activation when required evidence, approval, or Last Verified fields are absent** (enforcement mechanism — Dataverse business rule, flow validation, or governance review — to be selected at build time, not asserted now). Catalog rows carry separate lifecycle/promotion/verification/commercialization state fields. ADR cross-references resolve to existing canon IDs.
- **Risks:** Duplication with existing capability tracking — reconcile before creating a second register; register bloat at v0.1 — core fields first per 4.1.
- **Expected output:** ADR v0.2 (Accepted-ready); canon standard draft v1.0; three register schema/template proposals.
- **jm1_executionlog relevance:** Log ADR acceptance, canon promotion, and register-schema approval as governance events.

---

## Annex A — Licensed Platform & Workload Map

Authoritative inventory of the JM1 licensed complement and the **default (candidate) workload assignment** per capability. Assignments are design defaults under the License-First principle (4.4), not build authorizations; final workload selection per capability is confirmed at build time by Chad with Jackie approval. The System Authority Model of the certified architecture governs throughout.

### A.1 Platform Inventory

| Platform / Workload | Authority / Role in Architecture |
|---|---|
| **Dataverse** | Operational system of record; all pipeline state tables, registers, agent logs |
| **Dynamics 365 Sales Enterprise** | Acquisition engine (per certified architecture). Leads, opportunities, qualification. Already in production use: INT-PUB-005 writes D365 Leads. |
| **Dynamics 365 Customer Service** (incl. Digital Messaging & Voice) | Case/engagement service management; omnichannel inbound (chat, SMS, voice). Candidate authority for service cases, escalations, and exception-review queues. |
| **Dynamics 365 Field Service** | Scheduling, work orders, resource management. Already installed/in commissioning in JM1-Core (appointment infrastructure). |
| **Dynamics 365 Customer Voice** | Survey and experience measurement authority. |
| **Dynamics 365 Customer Insights – Journeys (Marketing)** | Outbound journeys, segments, campaign orchestration, consent-aware marketing communications. |
| **Power Apps** | Interfaces: model-driven admin apps, intake forms (author marketing intake already decided as Power Apps), canvas apps |
| **Power Automate** | Orchestration layer; all flow-based automation and approvals |
| **Copilot Studio** | Agent hosting/runtime layer for conversational and task agents (Tier 1/2 candidates) |
| **Azure AI Foundry / Azure OpenAI Service** | Governed model management and production AI execution |
| **Azure Communication Services** | Programmatic SMS/voice/email rails (614-965-6057 via Teams Phone ecosystem) |
| **Business Central** | Financial authority — sole ledger. Agents stage; BC records. |
| **SharePoint / OneDrive** | Document authority |
| **Power BI** | Semantic models and reporting (visualization layer of Capability 11) |
| **Microsoft 365 (Outlook, Teams, Bookings)** | Communications and scheduling surfaces |
| **Entra External ID + Next.js on Azure** | External Experience Layer (portals) |
| **GitHub + Codex workflows** | Code lifecycle |
| **Planning Center** | AIC ministry authority — outside the JM1 commercial graph per Section 5.4 |

### A.2 Default Capability-to-Workload Assignments

| Capability | Default Licensed Workload(s) | Custom-Build Residual |
|---|---|---|
| 1 Universal Intake Engine | **Sales Enterprise** (lead/opportunity) + Power Apps forms + Power Automate routing | Web intake endpoints (proven: INT-PUB-005 pattern) |
| 2 Universal AI Router | Copilot Studio + Azure AI Foundry/AOAI under the Trust & Control Fabric | Router logic, confidence routing, jm1_airequestlog writes |
| 3 Universal Workflow Engine | Power Automate + Dataverse state tables | Pipeline-mechanics templates (5.1) |
| 4 Enterprise Work Management | Evaluate **Field Service work orders** and Customer Service cases before designing any custom work-item table | Only if licensed work models fail the abstraction decision (Section 3, #4) |
| 5 Universal Client Portal | Entra External ID + Next.js (PROGRAM-002 pattern); Power Pages remains rejected per prior decision | Portal application code |
| 6 Document Intelligence | SharePoint authority + jm1_document + AI Builder/Foundry extraction | Review-package assembly |
| 7 Universal Approval System | **Power Automate Approvals** + Dataverse status models | Band-system guard conditions |
| 8 Enterprise Communications | **Customer Insights–Journeys** (outbound journeys, consent) + **Customer Service Digital Messaging/Voice** (inbound omnichannel) + ACS + Outlook/Teams | Dispatcher orchestration only — no shadow template engine |
| 9 Enterprise AI Workforce | Copilot Studio (runtime) + Foundry/AOAI (models) + Dataverse (registry/logs) | Agent specifications per Section 6 |
| 10 Knowledge Graph | Dataverse Unified Relationship Layer (jm1_contact/jm1_relationship/consent) | Enrichment logic (10.2-gated) |
| 11 Enterprise Analytics Platform | Power BI semantic/reporting now; physical store deferred to the dedicated future ADR (Fabric/Lakehouse candidates) | None until that ADR |
| 12 Command Center | Power BI | Dashboard build |
| 13 Capability Catalog | Dataverse register (post-freeze); repository template now | Schema only in this pass |
| Surveys / Success Measures (cross-cutting) | **Customer Voice** — default for the post-appointment survey backlog item, Impact Reporter outcome collection, and Catalog Success Measures experience data; supersedes the Forms-based design pending confirmation | Survey-to-Dataverse mapping |
| Scheduling (cross-cutting) | **Bookings** (client self-service) + **Field Service** (resource/work-order) — core-scheduling-01 must state which lane it occupies | Reminder/sync flows (existing) |

### A.3 Annex Governance

- Annex A is maintained as part of the Capability Catalog (fields: Default Workload, Custom-Build Residual, License-First justification).
- Any capability or agent spec that departs from its default workload must record the justification before build approval.
- Licensing changes (added/retired workloads) trigger an Annex A review, logged as a governance event.
- Pillar note: licensed workloads deployed for Foundation/AIC purposes respect the Nonprofit Core boundary and Section 5.4; a shared license does not create shared data.

---

## 12. Decision Record (per Council audit)

| Decision | Recommended Status |
|---|---|
| Recognize the JM1 Enterprise Capability Map | **APPROVE WITH REVISIONS** (revisions applied in v0.2) |
| Establish the Capability Catalog and Promotion Gate | **APPROVE** |
| Adopt J0–J8 as the first certified pipeline reference implementation | **APPROVE WITH TRUTHFUL STATUS REVISION** (applied: Commissioning in Production, stage-certified) |
| Adopt the Enterprise Pipeline Standard mechanics | **APPROVE** |
| Adopt the Agent Workforce roles as a planning census | **APPROVE AS NON-BINDING TARGET STATE** |
| Adopt the autonomy framework (A0–A4, three-dimension classification) | Revised per audit — **Requires Jackie Approval** |
| Adopt the governed self-improvement loop | **APPROVE WITH AUTHORITY-BOUNDARY REVISIONS** (applied) |
| Prioritize Sentinel after Wave 1 | **APPROVE AS OBSERVABILITY CAPABILITY, SUBJECT TO SCOPE FREEZE** |
| Approve cross-pillar unified views | **DO NOT APPROVE — REMAINS BLOCKED** (10.2) |
| Commission Tier 2 JMF agents beyond A2 | **DO NOT APPROVE — COMPLIANCE AND BOUNDARY REVIEW REQUIRED** |
| Begin production implementation | **DO NOT AUTHORIZE THROUGH THIS ADR** |
| Designate delegated suspension authority (7.3 open question) | **Requires Jackie Decision** |
| Adopt the License-First / Buy-Before-Build principle (4.4) | **Requires Jackie Approval** |
| Adopt Annex A as the default workload map, maintained in the Capability Catalog | **Requires Jackie Approval** |
| Customer Voice supersedes Forms for the survey backlog item | **Requires Jackie Confirmation** (design change to an existing backlog decision) |

**Approval line:** ____________________ Jackie, J Merrill One — Date: __________

*Draft — For Review. Model output is recommendation. Jackie approval creates canon. Logged execution creates operational truth.*
