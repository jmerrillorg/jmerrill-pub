---
Status: SCHEMA-PROPOSAL
Classification: Spec-only
Production Implementation Authorized: No
Last Verified: 2026-07-15
last_verified_date: 2026-07-15
---

# Pipeline Register Schema v0.1

The Pipeline Register records governed lifecycle stages. J0–J8 is the designated first JM1 enterprise reference implementation, certified stage by stage through the Pipeline Register.

| Display Label | Schema Name | Required | Notes |
|---|---|---:|---|
| Pipeline ID | pipeline_id | Yes | Stable pipeline identifier. |
| Pipeline Name | pipeline_name | Yes | Human-readable pipeline name. |
| Entity / Organization | entity_organization | Yes | Owning legal/entity boundary. |
| Business Owner | business_owner | Yes | Business approval owner. |
| Operational Owner | operational_owner | Yes | Execution owner. |
| Pipeline Lifecycle State | pipeline_lifecycle_state | Yes | Proposed, defined, commissioning, operational, retired. |
| Architecture Pillar | architecture_pillar | Yes | Commercial, nonprofit, shared, ministry, etc. |
| State Authority | state_authority | Yes | Source of operational truth. |
| Entry Criteria | entry_criteria | Yes | Required entry state. |
| Stage ID | stage_id | Yes | J0-J8 or other stage ID. |
| Stage Name | stage_name | Yes | Stage name. |
| Stage Description | stage_description | Yes | Stage purpose. |
| Stage Owner | stage_owner | Yes | Accountable role. |
| Execution Mode | execution_mode | Yes | Manual, AI-assisted, Flow-orchestrated, Agent-executed, Hybrid. |
| Required Fields | required_fields | Yes | Minimum data required. |
| Permitted Transitions | permitted_transitions | Yes | Allowed next states. |
| Gate Conditions | gate_conditions | Yes | Approval/evidence controls. |
| Exception States | exception_states | No | Holds, blocked, rejected, etc. |
| Evidence Requirements | evidence_requirements | Yes | Required evidence artifacts. |
| Execution Log Event Types | executionlog_event_types | No | Relevant Core event types. |
| Stage Certification Status | stage_certification_status | Yes | DEFINED, COMMISSIONING, PROVEN, CERTIFIED, BLOCKED, NOT_YET_VERIFIED, RETIRED. |
| Stage Certification Evidence | stage_certification_evidence | Yes | Exact source evidence or NOT_YET_VERIFIED. |
| Last Verified | last_verified_date | Yes | ISO date. |
| Related Capabilities | related_capabilities | No | Capability IDs/names. |
| Related Canon | related_canon | No | Canon/ADR reference. |
| Version | version | Yes | Row/schema version. |
| Supersedes | supersedes | No | Prior pipeline/stage row. |
| Notes | notes | No | Caveats. |

