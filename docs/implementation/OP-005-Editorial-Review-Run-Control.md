# OP-005 Editorial Review Run Control

Status: implementation checkpoint

## Purpose

Move certified `/join` submissions from Stage 0 handoff into governed Stage 3 Editorial Review run control.

Canonical lifecycle:

`/join completed -> intake created -> workspace created -> manuscript received -> Stage 0 handoff created -> review readiness evaluated -> Ready for Editorial Review -> Scheduled or Run Now -> Publisher Approval Required -> publisher approval/override -> author recommendation email`

## Implemented

- Readiness model for:
  - Waiting for Author
  - Ready for Editorial Review
  - Scheduled
  - Running
  - Publisher Approval Required
  - Recommendation Sent
  - Hold / Exception
- Next-business-day 10:00 AM scheduling calculation.
- Scheduled-run due/not-due evaluation.
- Run Editorial Review Now acceptance and duplicate-prevention model.
- Safe execution-log payload builder for run-control events.
- Internal HTTP action surface: `/api/run-editorial-review-now` on `func-jm1-diagnostic-ai-runner`.
- Testable workspace movement gate evaluator that holds the workspace in `00_Inquiry` until all Editorial Review exit conditions are satisfied.

## Runner Contract Correction

The Stage 3 runner now supports the corrected PROGRAM-002 lifecycle:

- Editorial Review runs before package recommendation and before package selection.
- `selectedPackageCode` is not required for Editorial Review.
- `opportunityId` may be carried when available, but it is not required.
- The runner can start from the intake-stage source model: diagnostic ID, intake reference, linked intake/manuscript URL, work type/title context, and manuscript content.
- The older strict pre-contract runner path is preserved for downstream agreement/onboarding workflows that still require Opportunity/package context.

The corrected pre-package runner always routes output to Publisher Approval Required. It does not send an author recommendation, does not write Opportunity, and does not activate agreement, payment, production, distribution, launch, royalty, or marketing actions.

## Safety Boundaries

- No author recommendation is sent automatically.
- No raw diagnostic scores are exposed to the author.
- No generic editorial methodology is introduced.
- No Stripe, Business Central, royalty, payment, public marketing, or production action occurs.
- Author recommendation email remains gated by publisher approval/override.

## Workspace Movement Boundary

Editorial Review readiness, scheduling, and running do not move the SharePoint workspace.

The workspace remains in `01_Pre-Pipeline/00_Inquiry` while Editorial Review is pending, scheduled, or running. Movement to `01_Manuscript_Review` is allowed only after:

1. Editorial Review is complete.
2. Publisher review is complete.
3. The recommendation is approved/sent.
4. Dataverse stage/status is updated.
5. `jm1_executionlog` records the transition where practical.
6. The SharePoint move succeeds.
7. Dataverse workspace URL, folder ID, and stage fields are updated.

Run-control events may queue or execute Editorial Review, but they must not treat the attempted stage as the completed workspace gate.

The exported movement-gate evaluator returns:

- `Hold Current Stage` while Editorial Review is running, awaiting Publisher review, or awaiting approved/sent recommendation.
- `Ready To Move` only after Editorial Review complete, Publisher review complete, recommendation approved/sent, Dataverse status updated, and transition evidence is available where practical.
- `Movement Complete` only after SharePoint move succeeds and Dataverse workspace URL/folder ID/stage writeback is complete.

## Validation Reference

Reference: `JMP-INT-202607-0W5PTQ`

Observed state:

- Intake exists.
- Workspace exists.
- Manuscript is received.
- Stage 0 handoff exists.
- Diagnostic status is `196650004` / Awaiting Jackie Review.
- Workspace remains correctly in `01_Pre-Pipeline/00_Inquiry`.

Run-control readiness evaluated as Ready for Editorial Review.

Corrected runner validation:

- Corrected pre-package Editorial Review executed for `JMP-INT-202607-0W5PTQ`.
- `selectedPackageCode` was not required.
- `opportunityId` was not required.
- Intake manuscript URL fallback was used because the diagnostic asset URL was not populated.
- Content-aware manuscript review ran.
- Diagnostic remained in Awaiting Jackie Review / Publisher Approval Required.
- Recommended package field was written for Publisher review.
- Execution log evidence was created.
- Author recommendation email was not sent.
- No Opportunity, Stripe, Business Central, royalty, payment, production, distribution, launch, or marketing action occurred.
