---
Status: SCHEMA-PROPOSAL
Classification: Spec-only
Production Implementation Authorized: No
Last Verified: 2026-07-15
last_verified_date: 2026-07-15
---

# Capability Catalog Schema v0.1

The Capability Catalog records recognized JM1 enterprise capabilities. It does not itself promote a capability to operational, enterprise-promoted, or commercially ready status.

| Display Label | Schema Name | Required | Notes |
|---|---|---:|---|
| Capability ID | capability_id | Yes | Stable identifier. |
| Capability Name | capability_name | Yes | Human-readable name. |
| Capability Type | capability_type | Yes | Enterprise, pillar, workflow, platform, or governance. |
| Definition | definition | Yes | What the capability does. |
| Business Outcome | business_outcome | Yes | Movement the capability enables. |
| Architecture Home | architecture_home | Yes | Canon or architecture reference. |
| Pillar / Entity Boundary | pillar_entity_boundary | Yes | Commercial, nonprofit, AIC, shared-services, or blocked boundary. |
| Lifecycle State | lifecycle_state | Yes | Proposed, defined, commissioning, operational, retired. |
| Promotion State | promotion_state | Yes | Mapped, operational, enterprise-promoted, commercially ready. |
| Control Owner | control_owner | Yes | Governance owner. |
| Operational Owner | operational_owner | Yes | Execution owner. |
| Last Verified | last_verified_date | Yes | ISO date. |
| Evidence Source | evidence_source | Yes | Repository, Core, SharePoint, tenant, or execution-log evidence. |
| Execution Log Event Types | executionlog_event_types | No | Relevant jm1_executionlog event names. |
| Default Workload | default_workload | No | Preferred Microsoft/JM1 workload after evaluation. |
| Entitlement-First Justification | entitlement_first_justification | Yes | Why selected/held/rejected. |
| Commercialization Readiness | commercialization_readiness | Yes | NOT_YET_VERIFIED, CANDIDATE, READY, BLOCKED. |
| Notes | notes | No | Constraints or open gaps. |

