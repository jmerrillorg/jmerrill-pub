# JM1 Author Workspace Operational Activity and Publishing Journey Report

Date: 2026-07-18

## Root Cause

The Author Workspace read model allowed completed package and generic `nextAction` language to populate active project messaging after the governed stage had already moved forward. That made The Intentional Leader display the correct stage while still describing the completed Copyediting review package as if it were the current activity.

## Corrected The Intentional Leader Display

Current business truth remains unchanged:

- Copyediting: Complete / Approved
- Proofreading: In Progress
- Current owner: Publisher
- Author action required: No
- Author package: Not released
- Next internal milestone: Proofreading internal QA
- Expected next author event: Proofreading package delivery

Expected Author Workspace display:

- Current Stage: Proofreading — In Progress
- Current Activity: The publishing team is proofreading your approved Volume I manuscript.
- Awaiting: Publisher
- Author Action: No action is required from you at this time.
- Next Step: We will complete internal quality review and send your proofreading package when it is ready for your review.
- Completed Packages: Volume I Copyediting Review Package — Approved

## Read-Model Changes

The project read model now exposes operational fields separately:

- `currentStage`
- `currentStageStatus`
- `currentOperationalActivity`
- `operationalActivityCode`
- `currentOwner`
- `awaitingParty`
- `authorActionRequired`
- `authorActionDescription`
- `nextOperationalActivity`
- `expectedAuthorEvent`
- `activePackage`
- `completedPackages`
- `completedMilestones`
- `blockingIssue`
- `lastMovement`

`currentActivity` and `nextStep` remain as compatibility aliases, but they are now populated from the stage-aware operational model rather than from stale package text.

## Stage-Aware Messaging Matrix

The operational model defines stage-specific activity codes for:

- Editorial Review
- Developmental Editing
- Line Editing
- Copyediting
- Proofreading
- Interior Layout
- Cover Design
- Production
- Distribution
- Published

Proofreading states now distinguish:

- Proofreading — In Progress
- Proofreading — Internal QA
- Proofreading — Author Review
- Proofreading — Corrections

## Historical Package Behavior

Completed packages are separated from active packages.

- Active Package: only artifacts tied to the current open author-review gate.
- Completed Packages: prior approved packages retained as history.
- Future packages: hidden until released.

For The Intentional Leader, the approved Copyediting package is retained as completed history and suppressed from active activity, next step, and author action messaging.

## Publishing Journey

The Author Workspace now labels the current project surface as `Your Publishing Journey` and renders milestone states for:

- Editorial Review
- Developmental Editing
- Line Editing
- Copyediting
- Proofreading
- Interior Layout
- Cover Design
- Production
- Distribution
- Published

Manual stage placement can show `Skipped by publisher placement` without fabricating prior-stage completion.

## Full Active-Title Audit

The remediation applies to every active author-visible project returned by the Author Workspace context, not only The Intentional Leader. Each project now resolves:

- current governed stage;
- stage status;
- awaiting party;
- author action requirement;
- current operational activity;
- next operational activity;
- active package eligibility;
- completed package history;
- publishing journey milestones.

## Conflict Guardrails

The read model detects and suppresses:

- completed package text used as active-stage messaging;
- Proofreading activity that references Copyediting review instructions;
- author-review language while Publisher owns the work;
- identical Current Activity and Next Step text;
- published legacy titles with active editorial author actions.

When a conflict is detected, the workspace falls back to stage-aware defaults and exposes a `blockingIssue` value for operational follow-up.

## Validation

Required targeted checks:

- completed Copyediting package plus active Proofreading stage;
- publisher-owned active work;
- author-review stage;
- stale package exclusion;
- distinct Current Activity and Next Step;
- stage terminology consistency;
- transition refresh after author approval;
- multiple titles at different stages.

## Execution Events

Canonical event names represented in source:

- AUTHOR_WORKSPACE_OPERATIONAL_ACTIVITY_MODEL_STARTED
- AUTHOR_WORKSPACE_STALE_PACKAGE_TEXT_REMOVED
- AUTHOR_WORKSPACE_STAGE_AWARE_STATUS_ACTIVATED
- AUTHOR_WORKSPACE_ACTIVITY_NEXT_STEP_SEPARATED
- AUTHOR_WORKSPACE_AWAITING_PARTY_ACTIVATED
- AUTHOR_WORKSPACE_PUBLISHING_JOURNEY_ACTIVATED
- AUTHOR_WORKSPACE_OPERATIONAL_CONFLICT_DETECTED
- AUTHOR_WORKSPACE_ACTIVE_PROJECT_REFRESH_COMPLETED
- AUTHOR_WORKSPACE_OPERATIONAL_ACTIVITY_MODEL_COMPLETED

## Editorial Boundary

No editorial stage was advanced.
No author package was released.
No communication was sent.
No author approval was inferred.

The Intentional Leader remains Proofreading — In Progress.
