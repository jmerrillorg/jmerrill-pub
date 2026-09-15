# JMP-V1V2-AUTO-001 Automation Capability Reconciliation

Date: 2026-09-15
Repository: jmerrill-pub
Baseline: origin/main @ 5a2439183d390881886ca26b4b5deacbbb332b13
Branch: codex/jmp-v1v2-auto-001

## Executive Level-Set

PUB-STAB-001 is closed. Current source authority is `origin/main`; this workstream did not touch the dirty original workspace and did not perform any title/provider/payment/mailbox mutation.

The V2 production system is not empty. It already contains meaningful automation assets:

| Area | Current V2 evidence | Classification |
| --- | --- | --- |
| Publisher Operating Center | `lib/server/publisher-operating-center.ts`, `/api/publisher/operating-center` | Operational projection/read model |
| 16-stage pipeline | `lib/publishing/lifecycle/*`, `/api/publisher/pipeline` | Operational projection/read model |
| Author/package dispatch | `lib/server/publishing-orchestrator.ts`, dispatch service usage | Operational with human gates |
| Inbound mailbox ingestion | Graph notification + delta reconciliation functions, inbound evidence store/queue | Operational evidence/queue layer; consequential action remains gated |
| Payment reply classification | `publishingReplyClassifier`, mailbox reply check | Operational classifier; structured end-to-end capture not yet fully commissioned for Whole |
| Payment schedule calculation | agreement/payment mapping and payment policy engines | Operational |
| Payment success ingestion | `lib/server/stripe/publishing-payment-event.ts` | Operational handler/recovery path |
| Agreement reconciliation | `lib/server/publishing/agreement-execution-reconciliation.ts` | Operational handler/recovery path |
| Adobe Sign API | `adobeSignClient.js` | Code-shaped but externally blocked; gate closed and credentials/API access absent in source evidence |

## Whole Canary Finding

Whole exposed the first true break in the V1 to V2 automation chain:

`PAYMENT_ELECTION_TRIGGER_NOT_DURABLY_BOUND_AFTER_AGREEMENT_COMPLETION`

Whole had executed agreement evidence, but the system did not autonomously turn that fact into a durable payment-election action request and governed author communication. The payment-option election email was sent through approved manual continuity, and the current Whole state remains:

| Field | Value |
| --- | --- |
| Stage 05 state | AGREEMENT_EXECUTED_PAYMENT_OPTION_PENDING |
| Payment election | PENDING_AUTHOR_SELECTION |
| Payment request created | NO |
| Next gate | Wait for Jacqueline/Jackuline payment-option reply, then ingest selection and create only the corresponding payment request |

This is not a pricing defect and not an agreement defect. It is an automation parity defect: the event/action chain after agreement completion is not commissioned end to end.

## Capability Registry

The source-backed registry is implemented at:

`lib/publishing/automation-capability-registry.mjs`

The Publisher Operating Center snapshot now exposes the same registry summary as read-only `automationHealth`; no manual status table or title/provider mutation was introduced.

It records every required P0 capability and selected P1 capabilities with:

CapabilityId, CapabilityName, BusinessPurpose, Trigger, SourceSystem, EventType, Handler, V2Authority, LifecycleEffect, CommunicationEffect, ExternalEffect, IdempotencyKey, FailureRoute, NotificationPolicy, ProductionStatus, Owner, EvidenceReference, SupersededV1Implementation, and RootCauseClassification.

Summary:

| Metric | Value |
| --- | ---: |
| Total registered capabilities | 21 |
| P0 capabilities | 15 |
| P1 capabilities | 6 |
| Unknown capability dispositions | 0 |
| P1 unowned missing migrations | 0 |
| Whole first break identified | YES |

Production status distribution:

| Status | Count | Meaning |
| --- | ---: | --- |
| V2_OPERATIONAL | 5 | Source evidence supports current operation |
| V2_OPERATIONAL_HUMAN_GATE | 12 | Capability exists but remains bounded by valid human/external authority |
| V2_OPERATIONAL_EXTERNAL_DEPENDENCY | 2 | V2 shape exists but provider/API dependency is not live |
| FOUNDER_DECISION_REQUIRED | 2 | Capability is not safely commissioned end to end and needs a bounded repair/authority decision |

## Root-Cause Level-Set

The repository shows a major-version automation parity gap:

`CAPABILITY_INVENTORY_INCOMPLETE_DURING_V2_MIGRATION`

Supporting classifications:

| Root cause | Current evidence |
| --- | --- |
| ADOBE_INTEGRATION_NOT_RECOMMISSIONED | Adobe client states no live credentials/API access and gate defaults closed |
| V2_HANDLER_IMPLEMENTED_BUT_TRIGGER_NOT_COMMISSIONED | Agreement and payment handlers exist, but Whole still required manual continuity after agreement completion |
| MAIL_INGESTION_NOT_RECOMMISSIONED | General inbound queue exists, but payment-option reply capture is not yet a fully durable commercial event/action chain |
| PAYMENT_INTEGRATION_NOT_RECOMMISSIONED | Payment request must still wait for selected option and locked schedule; no request should be created early |
| FOUNDER_NOTIFICATION_PROJECTION_NOT_RECOMMISSIONED | Operating Center projects many states, but automation capability health was not a formal registry/gate before this work |

## Active Noninterference

This workstream performed no live business mutation.

| Surface | Result |
| --- | --- |
| BYWB provider/title state | READ ONLY / NOT MUTATED |
| Whole author/payment state | READ ONLY; existing manual email evidence preserved |
| CoreSource/provider state | NOT TOUCHED |
| Adobe | NOT TOUCHED |
| Stripe/payment request | NOT CREATED |
| Author communications | 0 sent by this action |
| Production deployments | 0 |
| External side effects | 0 |

## Suggested Next Steps

1. Open bounded PR 1: ship the registry/guard and expose its summary in the Publisher Operating Center as Automation Health. This is read-only and should be safe to merge/deploy.

2. Open bounded PR 2: implement `PAYMENT_ELECTION_REQUIRED` action-request creation after `AGREEMENT_COMPLETED` when no valid payment election exists. The effect should be evidence/action-request only unless communication authority and duplicate-send guard pass.

3. Open bounded PR 3: bind inbound payment-option replies to the Whole/commercial event chain. The current classifier can identify selected options, but the live chain must persist `PAYMENT_OPTION_SELECTED`, generate the governed payment schedule, and create only the selected payment request.

4. Open bounded PR 4: add Operating Center projection for `WAITING_ON_AUTHOR`, `NEEDS_FOUNDER_DECISION`, `AUTOMATION_EXCEPTIONS`, `READY_TO_ADVANCE`, and `RECENT_AUTOMATED_ACTIONS` from the registry plus event/action state.

5. Hold Adobe live recommissioning until provider/API credentials are proven. Do not treat manual Adobe completion as a defect, but do classify the lack of provider-native webhook/audit ingestion as an external dependency gap.

6. Keep BYWB distribution decisions separate. BYWB remains in its provider/public-effect authority workstream and must not be used as an automation recommissioning canary.

## Return

JMP_V1V2_AUTO_001_STATUS = IN_PROGRESS_FOUNDATION_RECONCILIATION_COMPLETE

UNKNOWN_CAPABILITY_DISPOSITIONS = 0

P0_CAPABILITIES_REGISTERED = 15

P1_CAPABILITIES_REGISTERED = 6

WHOLE_FIRST_BREAK =
PAYMENT_ELECTION_TRIGGER_NOT_DURABLY_BOUND_AFTER_AGREEMENT_COMPLETION

JACKIE_AS_EVENT_BUS =
YES_FOR_PAYMENT_ELECTION_TRIGGER_UNTIL_PR2_PR3_REPAIR

AUTHOR_COMMUNICATIONS_SENT_BY_THIS_ACTION = 0

PAYMENT_REQUESTS_CREATED_BY_THIS_ACTION = 0

PROVIDER_MUTATIONS_BY_THIS_ACTION = 0

PRODUCTION_DEPLOYMENTS_BY_THIS_ACTION = 0
