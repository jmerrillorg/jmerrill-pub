# OP-005 Editorial Review Run Control

Status: operational with exception-driven Publisher Review

## Purpose

Move certified `/join` submissions from Stage 0 handoff into governed Stage 3 Editorial Review run control.

Canonical lifecycle:

`/join completed -> intake created -> workspace created -> manuscript received -> Stage 0 handoff created -> review readiness evaluated -> Ready for Editorial Review -> Scheduled or Run Now -> Editorial Review -> Classification Engine -> Package Recommendation -> Alternate Package -> Imprint Assigned -> if exception: Publisher Review Required; otherwise: Recommendation Sent -> Await Author Response`

## Implemented

- Readiness model for:
  - Waiting for Author
  - Ready for Editorial Review
  - Scheduled
  - Running
  - Publisher Review Required
  - Recommendation Sent
  - Awaiting Author Response
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

The corrected pre-package runner no longer routes every successful result to Publisher approval. Publisher Review is exception-driven.

Standard path:

1. Lock imprint.
2. Persist recommended package.
3. Persist alternate package, except Starter has no lower alternate.
4. Generate the author recommendation draft.
5. Send the author recommendation email through the approved author-response provider.
6. Copy or internally mirror to `publishing@jmerrill.one`.
7. Await author response.

Exception path:

Route to `Publisher Review Required` only when one of these named reasons applies:

- JM Signature Candidate
- Hard Stop
- Legal Review
- Rights Review
- Ethics Review
- Confidence Review
- Publisher Override Requested
- Doctrine Conflict

The runner does not write Opportunity, generate agreement/payment, start production, move workspace, activate distribution, launch, royalty, or marketing actions.

## Safety Boundaries

- Author recommendation is sent automatically only for no-exception standard Editorial Review results.
- No raw diagnostic scores are exposed to the author.
- No generic editorial methodology is introduced.
- No Stripe, Business Central, royalty, payment, public marketing, or production action occurs.
- Exception cases do not send an author recommendation until Jackie resolves the exception.

## Workspace Movement Boundary

Editorial Review readiness, scheduling, and running do not move the SharePoint workspace.

The workspace remains in `01_Pre-Pipeline/00_Inquiry` while Editorial Review is pending, scheduled, or running. Movement to `01_Manuscript_Review` is allowed only after:

1. Editorial Review is complete.
2. Publisher review is complete when an exception review was required.
3. The recommendation is approved/sent.
4. Dataverse stage/status is updated.
5. `jm1_executionlog` records the transition where practical.
6. The SharePoint move succeeds.
7. Dataverse workspace URL, folder ID, and stage fields are updated.

Run-control events may queue or execute Editorial Review, but they must not treat the attempted stage as the completed workspace gate.

The exported movement-gate evaluator returns:

- `Hold Current Stage` while Editorial Review is running, awaiting exception Publisher review, or awaiting sent recommendation.
- `Ready To Move` only after Editorial Review complete, any required Publisher review complete, recommendation sent, Dataverse status updated, and transition evidence is available where practical.
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
- Standard-path diagnostics move to recommendation-ready/sent without default Publisher approval.
- Exception diagnostics remain in Publisher Review Required with a named reason.
- Recommended package field is written by governed automation.
- Execution log evidence was created.
- Author recommendation email sends automatically only after the no-exception path succeeds and the approved author-response provider is enabled.
- No Opportunity, Stripe, Business Central, royalty, payment, production, distribution, launch, or marketing action occurred.
