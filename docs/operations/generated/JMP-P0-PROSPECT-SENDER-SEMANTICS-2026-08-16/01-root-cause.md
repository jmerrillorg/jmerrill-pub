# Root Cause

Last verified: 2026-08-16T07:58:00Z

The defect was not in PR #513's prospect lifecycle policy. The defect was a split-runtime seam:

- canonical app policy correctly distinguishes prospect inquiry from active contracted author;
- Azure Functions recommendation sender/resender continued using generic author-response wording and post-send persistence;
- the resend event payload and diagnostic patch encoded `Awaiting Author Response`;
- the automatic Editorial Review send route also returned `REVIEW_RUN_STATUS.AWAITING_AUTHOR_RESPONSE`.

That made a prospect Editorial Review recommendation look like an active-author editorial-stage approval wait after delivery.

Correction must happen in the reusable sender/resender route, not by patching Atta's Dataverse record.

