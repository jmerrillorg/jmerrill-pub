# Publisher Operating Center

Existing queue module is reused.

Required authoritative intake queue columns:

- Prospect
- Project
- Submitted
- Manuscript
- Current State
- Waiting On
- Age
- Alert

Implemented foundation:

- Intake route no longer hides manuscript-pending inquiries behind failed Editorial Review orchestration.
- Notification failures remain downstream and recoverable.

Not yet complete:

- UI filters for New Today, Unacknowledged, Manuscript Pending, Editorial Review Ready, Editorial Review Aging, Recommendation Pending, System Error, Notification Failed, and Stale Inquiry.
- Native Dataverse state fields for queue read model.

