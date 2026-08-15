# Stage 0 Context Routing

Last verified: 2026-08-15

Evidence source:

- `lib/server/publisher-operating-center.ts`
- `lib/server/publishing-dispatch-service.ts`

Observed path:

`/join` intake may call `autoInitializeOutsideInquiryEditorialReview`, initialize Editorial Review, wait for Stage 0 diagnostic handoff, and dispatch the editorial-review runner.

Remediation:

The active-author dispatch service now blocks prospect `EDITORIAL_REVIEW` with `PROSPECT_EDITORIAL_REVIEW_REQUIRES_PROSPECT_PACKAGE_SELECTION_PATH`.
