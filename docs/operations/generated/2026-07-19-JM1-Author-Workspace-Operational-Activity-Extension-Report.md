# JM1 Author Workspace Operational Activity Extension Report

## Accepted Baseline

PR #301 remains the accepted remediation pattern for stage-aware author messaging: active stage, current work, next step, author action, active package, and completed package history are resolved separately.

The immediate stale Copyediting-to-Proofreading text defect remains closed in source. Completed package language is suppressed from active Current Activity, Next Step, Author Action, Awaiting, and active package surfaces unless an associated author gate is open.

Live-state caveat: after the accepted baseline was written, Publisher Operations Wave 2 released the Proofreading author-review package in Core. The current live Core state for The Intentional Leader is therefore A5 Proofreading Completion / Awaiting Author Response, not the older Proofreading In Progress / no active package baseline. This implementation does not revert that business state.

## Read-Model Extension

Existing fields reused:

- `currentStage`
- `currentStageStatus`
- `currentOwner`
- `authorActionRequired`
- `currentActivity`
- `nextStep`
- `activePackage`
- `completedPackages`
- `lastMovement`

Fields activated or added:

- `awaitingParty`
- `authorActionDescription`
- `nextOperationalActivity`
- `expectedAuthorEvent`
- `blockingIssue`
- `completedMilestones`
- `currentMilestones`
- `upcomingMilestones`
- `lastUpdated`

Core sources remain the existing title, publishing asset, editorial stage, editorial summary, editorial approval gate, editorial artifact, and catalog portfolio records. No Dataverse schema change was introduced.

## Active Portfolio Audit

| Title | Current Core Stage | Gate / Owner | Current Activity | Next Step | Active Package | Completed Packages / Journey |
| --- | --- | --- | --- | --- | --- | --- |
| The Intentional Leader | Proofreading / Plan Delivered | A5 Awaiting Author Response / Author | Your proofreading package is ready for review. | Please review the proofread manuscript and reply to the publishing team with your approval or requested corrections. | Proofread manuscript and Proofreading package are active because A5 is open. | Developmental Editing, Line Editing, and Copyediting packages remain historical Approved packages. Cover Design is represented as concurrent Current; Interior Layout is Upcoming until the final manuscript is approved. |
| Before You Were Born | Developmental Editing / In Progress | Publisher | Developmental Editing is in progress. Internal source lock, analysis, and developmental planning are underway. No author action is required until the developmental plan is prepared for review. | No action is required from you at this time. We will update you when the developmental plan is ready for review. | None | Entered current workflow at Developmental Editing without fabricated prior-stage completion. |
| The General's Will and Last Testament | Developmental Editing / In Progress | Publisher | Developmental Editing is in progress with the rights and sensitivity watchlist preserved. Internal source lock, analysis, and developmental planning are underway. No author action is required until the developmental plan is prepared for review. | No action is required from you at this time. We will update you when the developmental plan is ready for review. | None | Entered current workflow at Developmental Editing without fabricated prior-stage completion. |
| The Long Watch | Editorial Review / In Progress | Publisher | Editorial Review has been initialized. No author action is required at this time. | No action is required from you at this time. We will update you when the editorial recommendation is ready. | None | Editorial Review is current. |
| Establishing Glory: The Library | Editorial Review / Complete with compilation reconciliation summary | Publisher | Editorial Review is complete. The publishing team is reconciling the current compilation path before assigning the next editorial stage. No author action is required at this time. | No action is required from you at this time. We will update you when the editorial recommendation is ready. | None | Compilation/source reconciliation is author-safe publisher-owned work; no ambiguity is exposed as an author task. |

## Publishing Journey

The journey path remains:

Editorial Review -> Developmental Editing -> Line Editing -> Copyediting -> Proofreading -> Interior Layout -> Cover Design -> Production -> Distribution -> Published

Milestone rules:

- Completed packages may mark their associated milestones complete.
- Active Core stage marks the matching milestone Current.
- Manual placement does not fabricate prior-stage completion.
- Prior milestones without direct evidence are marked `Skipped by publisher placement` with the note: `Entered the current publishing workflow at this stage.`
- Cover Design may be Current concurrently with Proofreading.
- Interior Layout remains Upcoming until the final manuscript is approved or an overlap is separately authorized.

## Conflict Prevention

Validation and fallback behavior now covers:

- current activity and next step resolving to identical text;
- stale package language on publisher-owned work;
- package-ready language without an open author package;
- author action requested without a released artifact;
- open author action conflicting with the gate state;
- published title with unexpected author action.

Conflicts are represented internally through `blockingIssue` for Publisher Today/read-model inspection. Authors receive safe stage-aware fallback copy instead of technical exception text.

## Validation

Local validation completed:

- `node scripts/author_stage_messaging.test.mjs`
- `node scripts/author_active_stage_artifact_visibility.test.mjs`
- `node scripts/publisher_today_read_model.test.mjs`
- `npm run type-check`
- `npm run lint` (passes with the existing `app/layout.tsx` font warning)
- `npm run build` (passes with expected missing build-time Dataverse catalog configuration warnings)
- `git diff --check`
- changed-file secret scan: no matches

No business stage was changed by this code slice. No package was released. No author communication was sent. No royalty records were changed.

## Final Boundary

The immediate Copyediting-to-Proofreading messaging defect remains closed. The Author Workspace now extends the same governed operational truth across the full active portfolio, showing each title's current work, responsible party, author action, next step, active and completed packages, concurrent production activity, and truthful publishing journey without stale package instructions or fabricated history.
