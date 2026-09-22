# Canonical Operational Board

Last verified: 2026-08-17T02:18:20.394Z

## Canonical Project Counts

```text
Raw confirmed P1 rows: 8
Unique confirmed P1 projects: 4
Raw active-editorial rows: 7
Unique active-editorial projects: 5
Raw active reconciliation rows: 53
Canonical project groups represented: 62
Duplicate/nonauthoritative rows: 4
Historical/lineage rows: 4
True unresolved canonical projects: 0
```

## Canonical P1 Recovery Queue

| Priority | Canonical Title | Author/Public Name | Current Stage | Last Human Promise | Days Waiting | Waiting On | What JMP Owes | Exact Manual Action Now | Do Not Do |
|---|---|---|---|---|---:|---|---|---|---|
| P0/P1 | Before You Were Born | Sean Crowley | DEVELOPMENTAL_AUTHOR_REVIEW_DELIVERY_FAILED | Author was asked to review a Developmental package, but the author-facing file was unusable. | 37 | JMP | Recover canonical Developmental source, generate certified author-facing Developmental package, validate attachments, then send replacement if no later valid response exists. | Preserve failed Aug 2 send and author error response; mark failed package superseded for current operations; recover source; certify replacement; send only after every attachment opens/renders and recipient identity is verified. | Do not count the failed delivery as author review, do not start the review clock, and do not expose internal package artifacts. |
| P1 | Establishing Glory: The Library | Jackie Smith, Jr. | DEVELOPMENTAL_AUTHOR_REVIEW_DELIVERY_FAILED | Author was asked to review a Developmental package, but the author-facing files were unusable. | 60 | JMP | Resolve source state to SOURCE_EXISTS_NEEDS_BINDING, SOURCE_EXISTS_NEEDS_VERSION_RECONCILIATION, or SOURCE_GENUINELY_MISSING; then certify/send replacement only if source is proven and no later valid response exists. | Search governed storage and bind the current Developmental source before any author-facing replacement; do not request source from author unless governed storage is proven empty. | Do not ask Jackie or the author to resend source while governed storage may already contain it. |
| P1 | The Long Watch | Jackie Smith, Jr. | DEVELOPMENTAL_AUTHOR_REVIEW_DELIVERY_FAILED | Author was asked to review a Developmental package, but the author-facing files were unusable. | 45 | JMP | Recover source, generate certified author-facing Developmental package, validate attachments, then send replacement if no later valid response exists. | Inspect source binding and package assembly; produce only Developmentally Edited Manuscript, Developmental Review Memo, and review instructions if needed; certify before replacement send. | Do not resend through the same defective package path or treat delivery as valid until container/open/render checks pass. |
| P1 | The Intentional Leader | Jackie Smith, jr. | 196650002 | Cover review was sent to author and approved. | 45 | JMP | Reconcile approved interior and approved cover boundary, then execute the next proven Production step; no author communication unless that production step requires it. | Confirm interior approval evidence, cover approval evidence, whether approved cover is concept or final full-wrap, and remaining production requirements before any production handoff or proof action. | Do not restart Editorial Review or Developmental work; do not send package-selection/prospect follow-up for this signed active project. |

## All Active Editorial Projects

| Priority | Canonical Title | Author/Public Name | Lifecycle | Current Stage | Latest Approved Artifact | Author Review State | Waiting On | Last Human Promise | Manual Action Now | Automation Mode |
|---|---|---|---|---|---|---|---|---|---|---|
| P1 | Establishing Glory: The Library | Jackie Smith, Jr. | ACTIVE_EDITORIAL | DEVELOPMENTAL_AUTHOR_REVIEW_DELIVERY_FAILED | 2026-08-02-Developmental-Editing-Establishing-Glory-The-Library-author-cover-message.txt; status Delivered; checksum present | BROKEN_DELIVERY_NO_VALID_REVIEW_CLOCK | JMP | Author was asked to review a Developmental package, but the author-facing files were unusable. | Search governed storage and bind the current Developmental source before any author-facing replacement; do not request source from author unless governed storage is proven empty. | ASSISTED_MANUAL_RECOVERY |
| P1 | The Long Watch | Jackie Smith, Jr. | ACTIVE_EDITORIAL | DEVELOPMENTAL_AUTHOR_REVIEW_DELIVERY_FAILED | 2026-08-02-Developmental-Editing-The-Long-Watch-author-cover-message.txt; status Delivered; checksum present | BROKEN_DELIVERY_NO_VALID_REVIEW_CLOCK | JMP | Author was asked to review a Developmental package, but the author-facing files were unusable. | Inspect source binding and package assembly; produce only Developmentally Edited Manuscript, Developmental Review Memo, and review instructions if needed; certify before replacement send. | ASSISTED_MANUAL_RECOVERY |
| P1 | The Intentional Leader | Jackie Smith, jr. | PRODUCTION | 196650002 | The_Intentional_Leader_-_Corrected_Interior_Layout_Proof.pdf; status Approved; checksum present | AUTHOR_APPROVED_COVER_DESIGN | JMP | Cover review was sent to author and approved. | Confirm interior approval evidence, cover approval evidence, whether approved cover is concept or final full-wrap, and remaining production requirements before any production handoff or proof action. | ASSISTED_MANUAL_RECOVERY |
| External Wait | The General’s Will and Last Testament | Iyorwuese Hagher | ACTIVE_EDITORIAL | DEVELOPMENTAL_AUTHOR_REVIEW | 2026-08-02-Developmental-Editing-The-General-s-Will-and-Last-Testament-author-cover-message.txt; status Delivered; checksum present | AWAITING_AUTHOR_DECISION | Author | Author was asked to respond Approved or Changes still required. | Do not resend. Check inbound response evidence only; if author responded, reconcile the decision before advancing to Line. | AUTHOR_WAIT_MONITOR_ONLY |
| P3 | 'TIL DEATH DO US PART | Jackie Smith, Jr. | ACTIVE_EDITORIAL | Editorial Review - 'TIL DEATH DO US PART |  | AUTHOR_APPROVAL_NOT_YET_CURRENT_GATE | Prospect | Editorial Review recommendation/package selection follow-up prepared or sent. | Monitor for the real prospect response; do not resend unless the response window or evidence requires Jackie-approved follow-up. | EXTERNAL_WAIT |

## JACKIE_EDITORIAL_RECOVERY_NOW

## Before You Were Born

Author: Sean Crowley

Current truthful stage: DEVELOPMENTAL_AUTHOR_REVIEW_DELIVERY_FAILED

What JMP last promised: Author was asked to review a Developmental package, but the author-facing file was unusable.

What happened: Author-reported file failure outranks a Delivered label; review clock cannot start from unusable delivery.

Use this artifact: 2026-07-21-Developmental-Editing-Before-You-Were-Born-Developmental-Memo.docx; status Delivered; checksum present

Do this now: Preserve failed Aug 2 send and author error response; mark failed package superseded for current operations; recover source; certify replacement; send only after every attachment opens/renders and recipient identity is verified.

After that: Author/Prospect waits only after certified handoff is completed.

Do not: Do not count the failed delivery as author review, do not start the review clock, and do not expose internal package artifacts.

## Establishing Glory: The Library

Author: Jackie Smith, Jr.

Current truthful stage: DEVELOPMENTAL_AUTHOR_REVIEW_DELIVERY_FAILED

What JMP last promised: Author was asked to review a Developmental package, but the author-facing files were unusable.

What happened: Governed storage/source evidence must be bound before asking the author for anything else.

Use this artifact: 2026-08-02-Developmental-Editing-Establishing-Glory-The-Library-author-cover-message.txt; status Delivered; checksum present

Do this now: Search governed storage and bind the current Developmental source before any author-facing replacement; do not request source from author unless governed storage is proven empty.

After that: Author/Prospect waits only after certified handoff is completed.

Do not: Do not ask Jackie or the author to resend source while governed storage may already contain it.

## The Long Watch

Author: Jackie Smith, Jr.

Current truthful stage: DEVELOPMENTAL_AUTHOR_REVIEW_DELIVERY_FAILED

What JMP last promised: Author was asked to review a Developmental package, but the author-facing files were unusable.

What happened: Certified communication/delivery evidence was invalidated by unusable attachment evidence.

Use this artifact: 2026-08-02-Developmental-Editing-The-Long-Watch-author-cover-message.txt; status Delivered; checksum present

Do this now: Inspect source binding and package assembly; produce only Developmentally Edited Manuscript, Developmental Review Memo, and review instructions if needed; certify before replacement send.

After that: Author/Prospect waits only after certified handoff is completed.

Do not: Do not resend through the same defective package path or treat delivery as valid until container/open/render checks pass.

## The Intentional Leader

Author: Jackie Smith, jr.

Current truthful stage: 196650002

What JMP last promised: Cover review was sent to author and approved.

What happened: Explicit author cover approval and approved interior artifact outrank stale Developmental or prospect/package-selection rows.

Use this artifact: The_Intentional_Leader_-_Corrected_Interior_Layout_Proof.pdf; status Approved; checksum present

Do this now: Confirm interior approval evidence, cover approval evidence, whether approved cover is concept or final full-wrap, and remaining production requirements before any production handoff or proof action.

After that: Author/Prospect waits only after certified handoff is completed.

Do not: Do not restart Editorial Review or Developmental work; do not send package-selection/prospect follow-up for this signed active project.
