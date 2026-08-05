# Slice 3 Execution Log Taxonomy

Status: DESIGN ONLY
Implementation authority: NO

## Event Standard

Every future Slice 3 event must include:

- event name;
- category;
- object type;
- object id or natural key;
- prior state;
- resulting state;
- actor;
- actor type;
- timestamp;
- correlation id;
- idempotency key;
- evidence reference;
- source authority;
- rollback reference when applicable.

Payloads must avoid author-facing leakage of internal execution IDs. Author-facing views receive plain-language projections only.

## Event Catalog

| Category | Event name | Payload | Correlation | Actor | Evidence |
|---|---|---|---|---|---|
| CATALOG | `CATALOG_AUTHORITY_READ` | title id, PF code, canonical SKU, catalog row id, status, pricing method, quoting status, scope gate | title + PF + catalog fingerprint | human or authorized runtime | Slice 2 catalog readback |
| CATALOG | `CATALOG_AUTHORITY_BLOCKED` | blocker code, PF code, canonical SKU, reason | title + PF + blocker | human or authorized runtime | catalog record / blocker evidence |
| CATALOG | `CATALOG_SUPERSESSION_RESPECTED` | legacy SKU, canonical SKU, supersession reason | legacy SKU + canonical SKU | human or authorized runtime | Slice 2 supersession record |
| PF | `PF_REQUESTED` | title id, PF code, request source, requested by | title + PF | human | request record |
| PF | `PF_CONTRACTED` | title id, PF code, contract/package/SOW reference, entitlement | title + PF + contract | human | contract/package/SOW evidence |
| PF | `PF_READY_FOR_PRODUCTION` | title id, PF code, Editorial Master version, readiness checklist | title + PF + master version | human | readiness package |
| PF | `PF_PRODUCTION_STARTED` | title id, PF code, input artifact, production owner | title + PF + version | human or future authorized runtime | production start evidence |
| PF | `PF_INTERNAL_QA_STARTED` | title id, PF code, output artifact, QA checklist | title + PF + output version | human | QA record |
| PF | `PF_AUTHOR_REVIEW_READY` | title id, PF code, author package, plain-language status | title + PF + author package | human | author review package manifest |
| PF | `PF_APPROVED` | title id, PF code, approval source, approved version | title + PF + approved version | human / author / publisher | approval record |
| PF | `PF_DISTRIBUTION_READY` | title id, PF code, FTL, ISBN, release anchor, package | title + PF + release anchor | human | distribution readiness checklist |
| PF | `PF_SUBMITTED` | title id, PF code, channel, submission id, submitted version | title + PF + channel | human or future authorized runtime | submission receipt |
| PF | `PF_LIVE_CONFIRMED` | title id, PF code, channel, live URL/id, confirmed-live date | title + PF + channel | human or future authorized runtime | live readback |
| PF | `PF_ON_HOLD` | title id, PF code, hold reason, owner, next action | title + PF + hold reason | human | hold register |
| PF | `PF_CANCELLED` | title id, PF code, cancellation reason, authority | title + PF | human | cancellation record |
| PF | `PF_RETIRED` | title id, PF code, retirement reason, effective date | title + PF | human | retirement record |
| TITLE | `TITLE_EDITORIAL_MASTER_VERSIONED` | title id, version, source artifact, checksum | title + master version | human | Editorial Master evidence |
| TITLE | `TITLE_FORMAT_TITLE_LOCK_VERIFIED` | title id, locked title, locked formats, FTL evidence | title + FTL version | human | FTL record |
| TITLE | `TITLE_ISBN_ASSIGNED_AFTER_FTL` | title id, PF code, ISBN, FTL reference | title + PF + ISBN | human | ISBN assignment evidence |
| TITLE | `TITLE_STATUS_PROJECTED_AUTHOR_SAFE` | title id, internal state, public label, message | title + projection version | human or future authorized runtime | projection rule / review |
| AUTHOR | `AUTHOR_REVIEW_PACKAGE_PREPARED` | title id, PF code, package manifest, response path | title + package | human | package manifest |
| AUTHOR | `AUTHOR_DECISION_RECORDED` | title id, PF code, decision, decision source | title + PF + decision | author / human publisher | decision record |
| AUTHOR | `AUTHOR_STATUS_UPDATED` | title id, prior label, new label, reason | title + label version | human or future authorized runtime | author-safe status evidence |
| RELEASE | `RELEASE_ANCHOR_SET` | title id, PF codes, release anchor, propagation lead | title + release anchor | human | release plan |
| RELEASE | `RELEASE_ANCHOR_CHANGED` | title id, prior anchor, new anchor, reason | title + anchor change | human | change authority |
| RELEASE | `RELEASE_PROPAGATION_EXCEPTION_APPROVED` | title id, channel, exception, approval | title + channel + exception | human | exception authority |
| RELEASE | `RELEASE_CONFIRMED_LIVE` | title id, PF code, channel, live date | title + PF + channel | human or future authorized runtime | live readback |
| DISTRIBUTION | `DISTRIBUTION_PACKAGE_READY` | title id, PF code, channel, package version | title + PF + channel | human | package checklist |
| DISTRIBUTION | `DISTRIBUTION_SUBMITTED` | title id, PF code, channel, submission id | title + PF + channel | human or future authorized runtime | submission receipt |
| DISTRIBUTION | `DISTRIBUTION_SUBMISSION_ACCEPTED` | title id, PF code, channel, acceptance id | title + PF + channel | human or future authorized runtime | acceptance readback |
| DISTRIBUTION | `DISTRIBUTION_SUBMISSION_REJECTED` | title id, PF code, channel, reason, next action | title + PF + channel | human or future authorized runtime | rejection notice |
| CORRECTION | `CORRECTION_AUTHORIZED` | title id, PF codes, reason, approval, affected versions | title + correction id | human approver | correction approval |
| CORRECTION | `CORRECTION_VERSION_CREATED` | title id, PF codes, prior version, new version | title + correction id + version | human | version record |
| CORRECTION | `CORRECTION_DISTRIBUTION_REQUIRED` | title id, PF codes, affected channels, required action | correction id + channel | human | impact analysis |
| CORRECTION | `CORRECTION_CLOSED` | correction id, final disposition, evidence | correction id | human | closure record |
| QA | `QA_STARTED` | title id, PF code, artifact, checklist | title + PF + artifact | human | QA checklist |
| QA | `QA_BLOCKER_FOUND` | title id, PF code, blocker, severity | title + PF + blocker | human | QA finding |
| QA | `QA_PASSED` | title id, PF code, artifact, approval | title + PF + artifact | human | QA approval |
| QA | `QA_FAILED` | title id, PF code, artifact, issues | title + PF + artifact | human | QA report |
| MANUAL_EXCEPTION | `MANUAL_EXCEPTION_OPENED` | title id, PF code, exception type, owner | title + exception | human | exception register |
| MANUAL_EXCEPTION | `MANUAL_EXCEPTION_RESOLVED` | exception id, resolution, evidence | exception id | human | resolution evidence |
| MANUAL_EXCEPTION | `CLIENT_TITLE_AUTOMATION_BLOCKED` | title id, attempted action, freeze rule | title + attempted action | human or future runtime | automation freeze policy |
| ROLLBACK | `ROLLBACK_AUTHORIZED` | object, from state, to state, reason, approval | rollback id | human approver | rollback authority |
| ROLLBACK | `ROLLBACK_COMPLETED` | rollback id, final state, evidence | rollback id | human or future authorized runtime | rollback evidence |
| ROLLBACK | `ROLLBACK_REJECTED` | rollback id, reason, required next action | rollback id | human approver | rejection record |

## Idempotency Key Pattern

Recommended future idempotency key:

`<event_name>:<object_type>:<object_id_or_key>:<state_or_action>:<version_or_channel>:<authority_reference>`

Examples:

- `PF_READY_FOR_PRODUCTION:PF:e797232b-PF03:READY_FOR_PRODUCTION:EM-v1.0:FTL-2026-08-05`
- `TITLE_ISBN_ASSIGNED_AFTER_FTL:TITLE:e797232b:PF03:ISBN978...:FTL-v1`
- `CORRECTION_AUTHORIZED:TITLE:e797232b:CORR-001:PF01-PF03:JACKIE-APPROVAL`

## Actor Rules

Allowed actor types:

- `HUMAN_PUBLISHER`
- `AUTHOR`
- `EXECUTIVE_APPROVER`
- `AUTHORIZED_RUNTIME` only after future implementation approval
- `SYSTEM_READBACK` for passive readback only

Forbidden actor claims:

- automation as client-title business owner while client-title automation is frozen;
- anonymous approval;
- actor without authority source;
- runtime mutation actor before implementation authorization.

## Evidence Rules

Every event must reference durable evidence. Evidence may be:

- Dataverse row id after implementation;
- SharePoint item id/path and checksum;
- GitHub run/commit/PR;
- package manifest;
- author decision record;
- distribution receipt/readback;
- manual exception register;
- executive approval record.

