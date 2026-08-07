# Security and Approvals

| Area | Role / actor | Permission boundary | Approval requirement |
| --- | --- | --- | --- |
| Lead intake | Commercial operator / system route | Create/update leads and activities only after configuration authority | No Jackie approval for routine routing. |
| Qualification | Jackie / delegated reviewer | Qualify/decline and set commercial pursuit posture | Jackie decision required. |
| Quote exception | Jackie | Approve discount, SOW, special terms, nonstandard package/PF | Jackie decision required. |
| Agreement issuance | Jackie / commercial operator | Generate agreement from approved inputs and current template | Jackie review required before issuance. |
| Payment projection | System | Read Stripe event and project status; no money movement | Jackie approval only for manual correction/refund exception. |
| Fulfillment authorization | System + Jackie exception owner | Evaluate standard gate; no title/PF runtime | Jackie approval for override/hold release. |
| Daily surface | Jackie / authorized operator | Read dashboards/queues only unless specific action permitted | No new write authority implied. |
| Evidence | System / authorized evidence writer | Write evidence references only after future authority | No production write under this package. |
