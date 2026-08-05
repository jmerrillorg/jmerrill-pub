# Author Experience

Status: DESIGN ONLY
Implementation authority: NO

## Projection Principle

Authors see plain-language project status, next action, and review needs. Authors must not see:

- PF state names;
- Dataverse terminology;
- execution IDs;
- internal blocker codes;
- internal QA labels;
- internal catalog fields;
- automation ownership labels.

## Author-Facing Labels

| Internal area | Author-facing label | Author-facing meaning |
|---|---|---|
| Editorial work active | Editing | We are preparing or refining the manuscript content. |
| Production work active | Production | We are preparing book files for the selected format(s). |
| PF-01 | Paperback | Your paperback edition is being prepared or reviewed. |
| PF-02 | Hardcover | Your hardcover edition is being prepared or reviewed. |
| PF-03 | eBook | Your eBook edition is being prepared or reviewed. |
| PF-04 | Audiobook | Your audiobook edition is being prepared or reviewed. |
| PF-05 | Large Print | Your large print edition is being prepared or reviewed. |
| PF-06 | Accessible Edition | Your accessible edition is being prepared or reviewed. |
| PF-08 | Interactive Edition | Your interactive edition is scoped and handled by approved plan. |
| Author action needed | Review Required | We need your review or decision before the next step. |
| Approved and queued | Preparing Release | Your approved files are being prepared for release or submission. |
| Submitted | Submitted | Your files have been submitted to the appropriate channel. |
| Live | Released | Your edition is live or release-confirmed. |
| Hold | Waiting | We are waiting on a decision, file, approval, vendor, or other dependency. |
| Cancelled | Stopped | This edition path has been stopped by approved decision. |
| Retired | Retired | This edition is no longer active for release. |

PF-07 should not appear as an author-facing commercial option under current authority.

## Example Author Status Cards

### Editing

Status: Editing

Message: We are working through the editorial stage for your manuscript. No release date has been set yet.

Action: None unless a review request appears.

### Production

Status: Production

Message: Your approved manuscript is being prepared for the selected format(s).

Action: None right now.

### Paperback

Status: Paperback

Message: Your paperback files are being prepared or reviewed.

Action: Review when a proof package is sent.

### Hardcover

Status: Hardcover

Message: Your hardcover files are being prepared or reviewed.

Action: Review when a proof package is sent.

### eBook

Status: eBook

Message: Your eBook files are being prepared or reviewed.

Action: Review when requested.

### Audiobook

Status: Audiobook

Message: Your audiobook is being prepared according to the approved narration plan.

Action: Review samples or final audio when requested.

### Review Required

Status: Review Required

Message: Your review is needed before we can continue.

Action: Open the review package and send your decision through the approved response path.

### Released

Status: Released

Message: This edition has confirmed release evidence.

Action: None unless a correction is requested.

## Suppressed Internal Detail

Do not expose:

- `REQUESTED`, `CONTRACTED`, `READY_FOR_PRODUCTION`, `IN_PRODUCTION`, `INTERNAL_QA`, `AUTHOR_REVIEW`, `APPROVED`, `DISTRIBUTION_READY`, `SUBMITTED`, `LIVE`, `ON_HOLD`, `CANCELLED`, `RETIRED`;
- `jm1pub_title`, `jm1pub_edition`, `jm1pub_commercialcatalogitem`, `jm1_executionlog`;
- event names such as `PF_DISTRIBUTION_READY` or `CORRECTION_AUTHORIZED`;
- execution-log IDs;
- raw SOW/catalog/pricing internals.

## Manual Operations Boundary

Because client-title automation is frozen, author-facing status updates remain manual unless a future executive approval explicitly authorizes automation.

