# OP-001 SharePoint Workspace Lifecycle

Status: operational with stage-exit movement gate

## Canonical Rule

The SharePoint workspace location represents the project's last successfully completed governance gate, not the stage currently being attempted.

Do not move a folder when work begins. Move the folder only after the current stage's exit gate is complete and logged.

## Movement Requirements

Folder movement occurs only after:

1. Dataverse stage/status is updated.
2. The required approval/gate is satisfied.
3. `jm1_executionlog` records the transition where practical.
4. The workspace move completes successfully.
5. Dataverse workspace URL, folder ID, and stage fields are updated.

## Initial Movement Logic

- `00_Inquiry` remains active while intake, manuscript receipt, and Editorial Review are pending or running.
- Move from `00_Inquiry` to `01_Manuscript_Review` only after Editorial Review is complete, Publisher review is complete, and the recommendation is approved/sent.
- Move from `01_Manuscript_Review` to the next production stage only after author acceptance, agreement/payment gates, and production activation are satisfied.
- Continue the same exit-gate pattern for Cover, Layout, Distribution, Marketing, and Author Success.

## Prohibited Movement

- Do not move folders at stage start.
- Do not duplicate workspaces.
- Do not delete old folders as part of movement.
- Do not move folders without Dataverse update.
- Do not move folders without transition logging where practical.
- Do not treat SharePoint as the system of record.

## Validation Checklist

Before any workspace movement:

- Confirm Dataverse stage/status has advanced to the completed gate.
- Confirm the stage exit approval/gate is satisfied.
- Confirm no duplicate workspace exists.
- Confirm the source workspace still points to the current Dataverse record.
- Record transition evidence in `jm1_executionlog` where practical.
- Move the existing workspace; do not create a replacement workspace.
- Write the new SharePoint workspace URL, folder ID, and stage fields back to Dataverse.
- Confirm author-facing workspace visibility does not expose the next stage before its gate is satisfied.

## OP-005 Gate Enforcement

OP-005 exposes a testable workspace movement gate evaluator for the Editorial Review exit. Automation should call this evaluator before invoking any SharePoint move operation.

The evaluator must return `Ready To Move` before moving from `00_Inquiry` to `01_Manuscript_Review`. It returns `Hold Current Stage` while Editorial Review is running or waiting for Publisher approval, and `Movement Complete` only after SharePoint move plus Dataverse workspace writeback both succeed.

## Certified Reference Check

Reference `JMP-INT-202607-0W5PTQ` remains correctly located under:

`01_Pre-Pipeline/00_Inquiry`

Reason: Editorial Review is Awaiting Jackie Review. The Editorial Review exit gate has not completed, Publisher review is not complete, and the recommendation has not been approved/sent.
