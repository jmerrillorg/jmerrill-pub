# Root Cause

Last verified: 2026-08-15

Evidence source:

- `lib/server/publisher-operating-center.ts`
- `lib/server/publishing-dispatch-service.ts`
- `lib/server/author-package-notification-engine.ts`
- `lib/server/author-facing-editorial-review-package.ts`

Root cause:

The system reused `EDITORIAL_REVIEW` as a stage/package identifier without an explicit lifecycle context. That allowed prospect Stage 0 Editorial Review to share active-author approval language, attachment expectations, and waiting-state semantics.

Contributing defects:

- Dispatch did not fail closed when `EDITORIAL_REVIEW` was still prospect/inquiry lifecycle.
- The author-facing Editorial Review builder contained active-author decision options.
- PDF certification accepted structurally valid but human-unusable one-line render patterns.
