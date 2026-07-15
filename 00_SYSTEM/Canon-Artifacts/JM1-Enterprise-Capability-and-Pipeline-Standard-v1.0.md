---
Status: CANON-CANDIDATE — Requires Jackie Approval
Source ADR: ADR-JM1-V3-EXT-001 v0.4
Certified Baseline: JM1-CANON-CERT-001
Classification: Spec-only
Production Implementation Authorized: No
Last Verified: 2026-07-15
last_verified_date: 2026-07-15
---

# JM1 Enterprise Capability and Pipeline Standard v1.0

## 1. Purpose and Authority

This canon-candidate standard governs JM1 enterprise capability recognition and promotion, governed lifecycle-pipeline mechanics, the Capability Catalog, the Pipeline Register, the Agent Registry, agent autonomy classification and promotion, entitlement-first workload selection, stage-by-stage certification, governance evidence, and Last Verified discipline.

The ADR identifier retains the V3 token only as a historical draft identifier. It does not establish Architecture v3 as an approved baseline. The current certified architectural baseline remains JM1-CANON-CERT-001.

## 2. Governing Principles

- Mapped does not mean operational. Operational does not mean enterprise-promoted. Enterprise-promoted does not mean commercially ready.
- Model output is recommendation. Jackie approval creates canon. Logged execution creates operational truth.
- Autonomy applies to execution within commissioned scope — never to scope itself.
- Models are replaceable. Governance is not.
- Existing entitlement creates a mandatory evaluation, not a mandatory selection.

## 3. Enterprise Capability Governance

A capability is recognized when JM1 has named the repeatable enterprise function, defined its business outcome, assigned ownership, and identified authoritative evidence. Recognition is not promotion.

Each capability must track lifecycle state, promotion state, verification state, and commercialization readiness. The Capability Promotion Gate decides whether a capability becomes an enterprise default, using Human-First evaluation, pillar and entity boundaries, evidence requirements, ownership, and supersession controls.

Part A introduced the Capability Catalog and Capability Promotion Gate. Part B introduced the Pipeline Register. Part C introduced the Agent Autonomy Promotion Gate and Agent Registry v2 extensions.

## 4. Enterprise Pipeline Standard

Every governed lifecycle pipeline must define stages, owners, entry criteria, permitted transitions, exception states, evidence requirements, and execution-log relevance.

J0–J8 is the designated first JM1 enterprise reference implementation, certified stage by stage through the Pipeline Register.

The complete J0–J8 pipeline is not blanket-certified by blueprint status. Each stage must prove its own certification state and must declare an execution mode:

- Manual
- AI-assisted
- Flow-orchestrated
- Agent-executed
- Hybrid

## 5. Register Governance

The Governance Registrar validates completeness, currency, provenance, and approval state for the three-register set:

1. Capability Catalog
2. Pipeline Register
3. Agent Registry

The Registrar is not an approval authority.

## 6. Agent Governance

Agent records must distinguish lifecycle state, autonomy tier, autonomy ceiling, risk tier, data classification, commissioned scope, prohibited actions, authoritative systems, runtime, trigger, guard conditions, human review threshold, material actions, execution-log event types, AI request-log requirements, failure handling, rollback behavior, exception routing, test evidence, risk validation, commissioning approval, Last Verified evidence, control owner, operational owner, registrar validation status, suspension status, and supersession.

Autonomy tiers:

- A0 — Observe/retrieve/classify/report; no business-state mutation.
- A1 — Draft/recommend; human performs action.
- A2 — Prepare/stage; human approval before material effect.
- A3 — Execute within commissioned scope; logged; exceptions escalate.
- A4 — Prohibited self-expanding or self-governing authority.

Pre-commissioned agents may not carry material business authority. A3 requires a separate Agent Autonomy Promotion Gate, bounded delegated authority, mandatory commissioning lifecycle, and prohibition on agent self-expansion or self-promotion.

## 7. Entitlement-First Standard

Workload selection must follow this evaluation order:

Use existing entitlement → Configure → Extend → Orchestrate → Custom-build only when justified.

Selection must consider functional fit, Human-First experience, governance, system authority, security, data boundary, cost, maintainability, administrative burden, and lock-in.

## 8. Organizational and Data Boundaries

The Commercial Hub boundary, Nonprofit Core boundary, and AIC as a separate ministry entity must be preserved. Shared licensing does not create shared data. Unified identity does not authorize unified cross-entity views. Cross-pillar unified views remain blocked unless separately authorized.

## 9. Verification and Evidence

Display label: Last Verified

Schema name: last_verified_date

Every governed register row must include evidence source, verification date, owner, version, approval reference, and execution-log relevance where applicable.

## 10. Commercialization Readiness

Commercialization readiness requires proof across at least two materially different implementations plus the remaining ADR commercialization conditions. One proof asset is not enough to declare commercial readiness.

## 11. Implementation Boundary

This standard does not authorize production builds, schema changes, production flows, agent activation, cross-pillar unified views, AIC data integration, or Annex A authority promotion.

