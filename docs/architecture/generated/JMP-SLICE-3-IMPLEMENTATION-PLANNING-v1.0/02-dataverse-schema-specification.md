# Dataverse Schema Specification

Status: SPECIFICATION ONLY
Dataverse mutations: 0
Schema provisioning: 0

## Field-Level Specification

| Entity | Proposed logical name | Type | Disposition | Requiredness | Purpose | Reuse rule | Blocked |
| --- | --- | --- | --- | --- | --- | --- | --- |
| jm1pub_title | jm1pub_current_title_lifecycle_state | Choice/Text/Lookup | EXTEND_EXISTING | Future required when implemented | current title lifecycle state | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_title | jm1pub_title_summary_state | Choice/Text/Lookup | EXTEND_EXISTING | Future required when implemented | title summary state | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_title | jm1pub_editorial_master_version | Choice/Text/Lookup | EXTEND_EXISTING | Future required when implemented | Editorial Master version | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_title | jm1pub_content_freeze_status | Choice/Text/Lookup | EXTEND_EXISTING | Future required when implemented | content-freeze status | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_title | jm1pub_format_and_title_lock_status | Choice/Text/Lookup | EXTEND_EXISTING | Future required when implemented | Format & Title Lock status | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_title | jm1pub_ftl_confirmation_evidence | Choice/Text/Lookup | EXTEND_EXISTING | Future required when implemented | FTL confirmation evidence | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_title | jm1pub_publishing_track | Choice/Text/Lookup | EXTEND_EXISTING | Future required when implemented | Publishing Track | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_title | jm1pub_release_model | Choice/Text/Lookup | EXTEND_EXISTING | Future required when implemented | release model | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_title | jm1pub_production_mode | Choice/Text/Lookup | EXTEND_EXISTING | Future required when implemented | production mode | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_title | jm1pub_core_release_readiness | Choice/Text/Lookup | EXTEND_EXISTING | Future required when implemented | core release readiness | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_title | jm1pub_release_anchor_date | Date | EXTEND_EXISTING | Future required when implemented | release anchor date | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_title | jm1pub_author_facing_projected_status | Choice/Text/Lookup | EXTEND_EXISTING | Future required when implemented | author-facing projected status | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_title | jm1pub_current_open_action | Choice/Text/Lookup | EXTEND_EXISTING | Future required when implemented | current open action | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_title | jm1pub_current_hold_reason | Choice/Text/Lookup | EXTEND_EXISTING | Future required when implemented | current hold reason | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_title | jm1pub_correction_state | Choice/Text/Lookup | EXTEND_EXISTING | Future required when implemented | correction state | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_title | jm1pub_current_architecture_version_authority | Choice/Text/Lookup | EXTEND_EXISTING | Future required when implemented | current architecture/version authority | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_edition | jm1pub_parent_title | Lookup | EXTEND_EXISTING | Future required when implemented | parent title | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_edition | jm1pub_product_form | Choice | EXTEND_EXISTING | Future required when implemented | product form | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_edition | jm1pub_current_pf_state | Choice | EXTEND_EXISTING | Future required when implemented | current PF state | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_edition | jm1pub_previous_pf_state | Choice | EXTEND_EXISTING | Future required when implemented | previous PF state | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_edition | jm1pub_state_entered_timestamp | DateTime | EXTEND_EXISTING | Future required when implemented | state entered timestamp | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_edition | jm1pub_contracted_status | Choice | EXTEND_EXISTING | Future required when implemented | contracted status | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_edition | jm1pub_production_readiness | Choice | EXTEND_EXISTING | Future required when implemented | production readiness | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_edition | jm1pub_isbn | Text | EXTEND_EXISTING | Future required when implemented | ISBN | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_edition | jm1pub_identifier_type | Choice | EXTEND_EXISTING | Future required when implemented | identifier type | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_edition | jm1pub_editorial_master_source_version | Text/Lookup | EXTEND_EXISTING | Future required when implemented | Editorial Master source version | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_edition | jm1pub_source_artifact | Lookup/Text | EXTEND_EXISTING | Future required when implemented | source artifact | Reuse existing field only if live metadata readback proves semantic match. | YES pending artifact/correction authority |
| jm1pub_edition | jm1pub_output_artifact | Lookup/Text | EXTEND_EXISTING | Future required when implemented | output artifact | Reuse existing field only if live metadata readback proves semantic match. | YES pending artifact/correction authority |
| jm1pub_edition | jm1pub_author_review_state | Choice | EXTEND_EXISTING | Future required when implemented | author review state | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_edition | jm1pub_qa_state | Choice | EXTEND_EXISTING | Future required when implemented | QA state | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_edition | jm1pub_distribution_readiness | Choice | EXTEND_EXISTING | Future required when implemented | distribution readiness | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_edition | jm1pub_submission_date | Date | EXTEND_EXISTING | Future required when implemented | submission date | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_edition | jm1pub_confirmed_live_date | Date | EXTEND_EXISTING | Future required when implemented | confirmed-live date | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_edition | jm1pub_release_date | Date | EXTEND_EXISTING | Future required when implemented | release date | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_edition | jm1pub_companion_edition_status | Choice | EXTEND_EXISTING | Future required when implemented | companion-edition status | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_edition | jm1pub_narration_method | Choice | EXTEND_EXISTING | Future required when implemented | narration method | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_edition | jm1pub_finished_hours | Decimal | EXTEND_EXISTING | Future required when implemented | finished hours | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_edition | jm1pub_large_print_complexity | Choice | EXTEND_EXISTING | Future required when implemented | large-print complexity | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_edition | jm1pub_accessibility_complexity | Choice | EXTEND_EXISTING | Future required when implemented | accessibility complexity | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_edition | jm1pub_interaction_complexity | Choice | EXTEND_EXISTING | Future required when implemented | interaction complexity | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_edition | jm1pub_sow_gate | Boolean/Choice | EXTEND_EXISTING | Future required when implemented | SOW gate | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_edition | jm1pub_current_hold | Choice | EXTEND_EXISTING | Future required when implemented | current hold | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_edition | jm1pub_current_blocker | Text | EXTEND_EXISTING | Future required when implemented | current blocker | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_edition | jm1pub_retirement_state | Choice | EXTEND_EXISTING | Future required when implemented | retirement state | Reuse existing field only if live metadata readback proves semantic match. | NO |
| jm1pub_edition | jm1pub_correction_lineage | Lookup/Text | EXTEND_EXISTING | Future required when implemented | correction lineage | Reuse existing field only if live metadata readback proves semantic match. | YES pending artifact/correction authority |
| jm1_executionlog | jm1_event_type | Text/Choice/Lookup/DateTime as appropriate | EXTEND_EXISTING | Future required when implemented | event type | Confirm existing columns by metadata readback before adding. | NO |
| jm1_executionlog | jm1_object_type | Text/Choice/Lookup/DateTime as appropriate | EXTEND_EXISTING | Future required when implemented | object type | Confirm existing columns by metadata readback before adding. | NO |
| jm1_executionlog | jm1_object_id | Text/Choice/Lookup/DateTime as appropriate | EXTEND_EXISTING | Future required when implemented | object ID | Confirm existing columns by metadata readback before adding. | NO |
| jm1_executionlog | jm1_prior_state | Text/Choice/Lookup/DateTime as appropriate | EXTEND_EXISTING | Future required when implemented | prior state | Confirm existing columns by metadata readback before adding. | NO |
| jm1_executionlog | jm1_resulting_state | Text/Choice/Lookup/DateTime as appropriate | EXTEND_EXISTING | Future required when implemented | resulting state | Confirm existing columns by metadata readback before adding. | NO |
| jm1_executionlog | jm1_correlation_id | Text/Choice/Lookup/DateTime as appropriate | EXTEND_EXISTING | Future required when implemented | correlation ID | Confirm existing columns by metadata readback before adding. | NO |
| jm1_executionlog | jm1_actor | Text/Choice/Lookup/DateTime as appropriate | EXTEND_EXISTING | Future required when implemented | actor | Confirm existing columns by metadata readback before adding. | NO |
| jm1_executionlog | jm1_actor_type | Text/Choice/Lookup/DateTime as appropriate | EXTEND_EXISTING | Future required when implemented | actor type | Confirm existing columns by metadata readback before adding. | NO |
| jm1_executionlog | jm1_timestamp | Text/Choice/Lookup/DateTime as appropriate | EXTEND_EXISTING | Future required when implemented | timestamp | Confirm existing columns by metadata readback before adding. | NO |
| jm1_executionlog | jm1_evidence_reference | Text/Choice/Lookup/DateTime as appropriate | EXTEND_EXISTING | Future required when implemented | evidence reference | Confirm existing columns by metadata readback before adding. | NO |
| jm1_executionlog | jm1_rule_id | Text/Choice/Lookup/DateTime as appropriate | EXTEND_EXISTING | Future required when implemented | rule ID | Confirm existing columns by metadata readback before adding. | NO |
| jm1_executionlog | jm1_transition_id | Text/Choice/Lookup/DateTime as appropriate | EXTEND_EXISTING | Future required when implemented | transition ID | Confirm existing columns by metadata readback before adding. | NO |
| jm1_executionlog | jm1_source_authority | Text/Choice/Lookup/DateTime as appropriate | EXTEND_EXISTING | Future required when implemented | source authority | Confirm existing columns by metadata readback before adding. | NO |
| jm1_executionlog | jm1_idempotency_key | Text/Choice/Lookup/DateTime as appropriate | EXTEND_EXISTING | Future required when implemented | idempotency key | Confirm existing columns by metadata readback before adding. | NO |
| jm1_executionlog | jm1_request_payload_hash | Text/Choice/Lookup/DateTime as appropriate | EXTEND_EXISTING | Future required when implemented | request payload hash | Confirm existing columns by metadata readback before adding. | NO |
| jm1_executionlog | jm1_result_payload_hash | Text/Choice/Lookup/DateTime as appropriate | EXTEND_EXISTING | Future required when implemented | result payload hash | Confirm existing columns by metadata readback before adding. | NO |
| jm1_executionlog | jm1_exception_code | Text/Choice/Lookup/DateTime as appropriate | EXTEND_EXISTING | Future required when implemented | exception code | Confirm existing columns by metadata readback before adding. | NO |
| jm1_executionlog | jm1_rollback_reference | Text/Choice/Lookup/DateTime as appropriate | EXTEND_EXISTING | Future required when implemented | rollback reference | Confirm existing columns by metadata readback before adding. | NO |
| jm1_executionlog | jm1_title_id | Text/Choice/Lookup/DateTime as appropriate | EXTEND_EXISTING | Future required when implemented | title ID | Confirm existing columns by metadata readback before adding. | NO |
| jm1_executionlog | jm1_edition_id | Text/Choice/Lookup/DateTime as appropriate | EXTEND_EXISTING | Future required when implemented | edition ID | Confirm existing columns by metadata readback before adding. | NO |
| jm1_executionlog | jm1_artifact_id | Text/Choice/Lookup/DateTime as appropriate | EXTEND_EXISTING | Future required when implemented | artifact ID | Confirm existing columns by metadata readback before adding. | YES pending related entity decision |
| jm1_executionlog | jm1_release_plan_id | Text/Choice/Lookup/DateTime as appropriate | EXTEND_EXISTING | Future required when implemented | release-plan ID | Confirm existing columns by metadata readback before adding. | YES pending related entity decision |

## Candidate New Entity Disposition

| Candidate concept | Recommended representation | Reason | Current disposition | Fail-closed behavior |
| --- | --- | --- | --- | --- |
| PF attribute values | Fields on jm1pub_edition unless multi-value extensibility is approved | Current attributes are finite complexity/gating flags and should not create false sub-forms. | BLOCKED_PENDING_AUTHORITY | Do not create child table until approved. |
| Release plans | Title fields for single plan; child entity only if many plans are approved | Architecture allows many Release Plans only if approved. | BLOCKED_PENDING_AUTHORITY | Use title release model/anchor fields only in spec. |
| Distribution jobs | Execution-log events initially; child entity if operational queue is approved | Submission/readback history can be event-backed. | BLOCKED_PENDING_AUTHORITY | Do not create job table. |
| Author-facing status projection | Calculated projection unless persistence is approved | Authors must not see internal PF state/log data. | BLOCKED_PENDING_AUTHORITY | Calculate from internal evidence for design. |
| Correction authorization | Specific event plus optional child entity for durable multi-edition scope | CORRECTION_AUTHORIZED is canonical; table need is unresolved. | BLOCKED_PENDING_AUTHORITY | Fail closed unless event/evidence exists. |
| Transition definitions | Versioned configuration entity or static registry after approval | Matrix must be enforceable and versioned. | BLOCKED_PENDING_AUTHORITY | Fail closed if transition absent from matrix. |

## Existing jm1_executionlog Assessment

The existing log is reused, but this package does not claim it already supports every required event-contract field. Future implementation must perform metadata readback and either document reuse or add governed extensions before runtime enforcement is commissioned.
