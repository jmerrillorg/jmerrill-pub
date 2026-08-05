# API and Service Contracts

Status: DESIGN ONLY
Routes created: 0
Runtime implementation: 0

## Proposed Services

| Service | Responsibility | Inputs | Outputs | Authorization | Idempotency | Dependencies | Failure Codes | Execution-Log Behavior | Prohibited Side Effects |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PublishingTitleLifecycleService | Validate and apply future title-level transitions and summary-state projection. | transition request, title ID, authority reference, evidence reference | accepted/no-op/fail-closed transition result | Publishing Lifecycle Administrator, Executive Approver for locks/holds | transition key; payload hash conflict fails | jm1pub_title, jm1_executionlog, artifact/version authority | TRANSITION_NOT_AUTHORIZED, TRANSITION_EVIDENCE_MISSING, TRANSITION_CANON_VERSION_MISMATCH | Emit exact TITLE event; no generic status changes | No edition mutation without edition service; no public or BC mutation. |
| PublishingEditionStateService | Validate and apply future edition/PF state transitions. | edition ID/product form/from/to/evidence/actor/correlation | accepted/no-op/fail-closed transition result | Publishing Operations, Production Lead, Distribution Lead by transition | transition ID + edition + source authority | jm1pub_edition, commercial catalog, execution log | TRANSITION_PRECONDITION_FAILED, TRANSITION_ACTOR_NOT_AUTHORIZED | Emit exact PF event | No PF-07 sellable path; no PF-08 without SOW. |
| PublishingCorrectionService | Authorize and track governed corrections. | title/edition scope, reason, approval, evidence | correction authorization result | Executive Approver | correction ID + approval reference | title, edition, artifact authority, execution log | CORRECTION_AUTHORITY_MISSING, TRANSITION_EVIDENCE_MISSING | Emit CORRECTION_AUTHORIZED and follow-on correction events | No production restart without approved scope. |
| PublishingReleasePlanService | Manage future release plans only after entity decision. | title ID, model, anchor, PF set, 21-day lead evidence | plan proposed/validated result | Publishing Lifecycle Administrator, Distribution Lead | title + model + anchor + sequence | title, edition, distribution, execution log | RELEASE_PLAN_ENTITY_NOT_AUTHORIZED, PROPAGATION_LEAD_FAILED | Emit TITLE_RELEASE_MODEL_SET or RELEASE_ANCHOR_SET | No auto-swap or production mutation. |
| PublishingDistributionService | Manage future submission/readback contracts. | edition ID, channel, package hash, submission evidence | job submitted/readback/fail-closed | Distribution Lead, System Readback for passive read | edition + channel + package hash + attempt | edition, release plan if approved, execution log | DISTRIBUTION_EVIDENCE_MISSING, LIVE_READBACK_MISSING | Emit distribution-specific events | No BC mutation, no public-surface mutation. |
| PublishingAuthorStatusProjectionService | Produce plain-language author-safe status. | title ID, edition states, holds, required action evidence | author-safe label/message/current action | Author Workspace Service read only | projection version + source state hash | title, edition, rules, execution log read | INTERNAL_STATUS_EXPOSURE_BLOCKED, PROJECTION_AUTHORITY_MISSING | May emit AUTHOR_STATUS_UPDATED if persistence approved | No internal PF codes, execution IDs, AI/automation internals. |
| PublishingExecutionLogService | Write and verify exact event evidence. | event code, object refs, payload hashes, evidence, actor | event written/no-op/conflict | Authorized service identities only after implementation approval | event idempotency key | jm1_executionlog | EVENT_CONTRACT_MISSING, IDEMPOTENCY_CONFLICT | Writes exact event only | No silent status mutation. |

## Proposed Protected Endpoints

| Endpoint | Method | Purpose | Status |
| --- | --- | --- | --- |
| /api/publishing/title/state-transition | POST | Future protected title transition endpoint. | DOCUMENTED ONLY - DO NOT CREATE ROUTE |
| /api/publishing/edition/state-transition | POST | Future protected edition/PF transition endpoint. | DOCUMENTED ONLY - DO NOT CREATE ROUTE |
| /api/publishing/correction/authorize | POST | Future correction authorization endpoint. | DOCUMENTED ONLY - DO NOT CREATE ROUTE |
| /api/publishing/release-plan | POST | Future release-plan endpoint if entity decision approves it. | DOCUMENTED ONLY - DO NOT CREATE ROUTE |
| /api/publishing/distribution-job | POST | Future distribution-job endpoint if entity decision approves it. | DOCUMENTED ONLY - DO NOT CREATE ROUTE |
| /api/publishing/title/author-status | GET | Future author-safe projection endpoint. | DOCUMENTED ONLY - DO NOT CREATE ROUTE |
