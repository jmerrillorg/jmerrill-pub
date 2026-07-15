---
Status: SCHEMA-PROPOSAL
Classification: Spec-only
Production Implementation Authorized: No
Last Verified: 2026-07-15
last_verified_date: 2026-07-15
---

# Agent Registry v2 Schema

This schema is a proposal only. It does not alter the live Agent Registry.

Lifecycle values: Proposed, Approved-to-Design, Specified, Built, Tested, Risk-Validated, Commissioned, Operational, Suspended, Retired.

Autonomy tiers:

- A0 — Observe/retrieve/classify/report; no business-state mutation.
- A1 — Draft/recommend; human performs action.
- A2 — Prepare/stage; human approval before material effect.
- A3 — Execute within commissioned scope; logged; exceptions escalate.
- A4 — Prohibited self-expanding or self-governing authority.

Required fields: agent_id, agent_name, agent_role, brand_or_enterprise_scope, fleet_state, lifecycle_state, autonomy_tier, autonomy_ceiling, risk_tier, data_classification, commissioned_scope, prohibited_actions, authoritative_systems, runtime, trigger, guard_conditions, human_review_threshold, material_actions, executionlog_event_types, airequestlog_required, failure_handling, rollback_behavior, exception_routing, test_evidence_reference, risk_validation_reference, commissioning_approval_reference, last_verified_date, last_verified_evidence_reference, control_owner, operational_owner, registrar_validation_status, suspension_status, supersedes, notes.

## Mandatory A3 Schema Rule

An A3 record is invalid unless all required A3 evidence fields are populated:

- commissioned_scope
- test_evidence_reference
- risk_validation_reference
- commissioning_approval_reference
- last_verified_date
- last_verified_evidence_reference
- exception_routing
- failure_handling
- rollback_behavior
- executionlog_event_types
- control_owner
- operational_owner

Future enforcement candidates: Dataverse business rule, Power Automate validation, application-layer validation, governed manual approval control.

