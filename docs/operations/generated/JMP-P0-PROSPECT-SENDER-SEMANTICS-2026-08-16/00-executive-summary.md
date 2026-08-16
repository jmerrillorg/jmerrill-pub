# P0 Prospect Sender Semantics

Last verified: 2026-08-16T07:58:00Z

Evidence source: runtime source inspection and focused Azure Functions tests.

## Root Cause

PR #513 corrected the website-side prospect lifecycle policy, but the Azure Functions sender/resender path still persisted a generic active-author-style post-send state after Editorial Review recommendation delivery.

The stale route was:

Stage 0 / Editorial Review -> `run-editorial-review-now` or `run-publisher-recommendation-action` -> `send-approved-author-response` -> Dataverse send log / diagnostic post-send patch.

The stale behavior wrote or returned `Awaiting Author Response` even when the communication was a prospect Editorial Review recommendation whose next business action is package selection or prospect questions.

## Runtime Correction

Added shared recommendation-send semantics for:

- `PROSPECT_INQUIRY` -> waiting owner `Prospect`, decision type `PROSPECT_PACKAGE_SELECTION`, response consumer `PACKAGE_SELECTION_CONSUMER`, response clock decision type `PROSPECT_PACKAGE_SELECTION`.
- `ACTIVE_CONTRACTED_AUTHOR` -> waiting owner `Author`, decision type `EDITORIAL_STAGE_APPROVAL`, response consumer `AUTHOR_REVIEW_RESPONSE_CONSUMER`, response clock decision type `EDITORIAL_STAGE_APPROVAL`.

The lifecycle context is now carried into:

- send approval metadata;
- template metadata;
- resend supersession/replacement execution-log evidence;
- diagnostic post-send patch;
- run-control response payload.

The prospect-facing recommendation template was also corrected so the package-selection CTA does not promise Author Workspace / portal access before that access is proven ready.

## Before / After

Before:

- prospect recommendation send could persist `Workflow remains Awaiting Author Response`;
- resend did not preserve prospect package-selection semantics;
- automatic run returned active-author-style awaiting response status.

After:

- prospect recommendation send persists `Waiting On Prospect Package Selection`;
- resend preserves lifecycle context;
- active-author sends retain `Awaiting Author Response`;
- response clock decision type is explicit.
- prospect package-selection message asks for package selection or questions only; no Author Workspace / author-portal CTA is present.

## Validation

- `npm ci` in `azure-functions/diagnostic-ai-runner`: PASS with Node 26 engine warning; package declares Node `>=22 <25`.
- `node --test test/authorRecommendationSendSemantics.test.js test/publisherRecommendationAction.test.js test/runEditorialReviewNow.test.js test/publisherRecommendationReview.test.js`: 17 / 17 PASS.
- `npm run lint`: PASS.
- direct syntax checks for modified runtime files: PASS.
- full `npm test`: 1894 / 1897 PASS; 3 existing failures remain in `agreementGeneratedPackageMirror.test.js` and are not in the prospect sender/resender path.

## Live Boundary

No production function deployment has been performed by this evidence file. Atta corrective send remains blocked until this runtime correction is merged and deployed to `func-jm1-diagnostic-ai-runner`.
