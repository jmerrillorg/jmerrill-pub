# Prospect Hold Lift

Last verified: 2026-08-16T02:38:45Z

Evidence source: production release proof plus production sender route inspection.

Status:

NOT LIFTED.

Reason:

Production deployment and website policy smoke proof passed, but the actual author/prospect send route still contains stale active-author response semantics. The prospect hold must remain in place until the production sender route is reconciled with the corrected package-selection contract.

Allowed while held:

- internal generation/certification;
- read-only audits;
- manual Jackie review.

Not allowed while held:

- automated prospect Editorial Review sends;
- Atta corrective send through `run-publisher-recommendation-action`;
- any portal CTA unless `WORKSPACE_CTA_READY` is proven for the target.
