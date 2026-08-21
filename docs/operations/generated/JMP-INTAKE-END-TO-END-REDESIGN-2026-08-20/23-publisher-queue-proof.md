# Publisher Queue Proof

Status: implemented locally; production readback pending.

Existing Publisher Operating Center remains the queue authority.

Added filters:

- New
- Unacknowledged
- Manuscript Pending
- Normalization Pending
- Editorial Ready
- Editorial Aging
- Recommendation Pending
- Notification Failed
- System Attention
- Stale Inquiry

Queue semantics:

- Manuscript missing remains visible as author/prospect action.
- Pages/PDF/DOC normalization states surface as `Manuscript normalization pending`.
- Notification failure is a queue/system attention concept, not a reason to lose intake.

Still required:

- Production synthetic proof that a valid intake appears in the queue even if notification fails.

