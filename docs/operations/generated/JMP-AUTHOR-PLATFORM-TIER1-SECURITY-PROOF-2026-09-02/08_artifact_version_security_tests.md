# Artifact Version Security Tests

Last verified: 2026-09-02T21:45:33Z

## Local Regression

Command:

`node --test scripts/program002_author_portal_logic.test.mjs scripts/program002_author_portal_access.test.mjs scripts/author_active_stage_artifact_visibility.test.mjs scripts/author_decision_closeout_propagation.test.mjs`

Result: `48 / 48 PASS`

Specific artifact/version findings:

- Author artifacts require an active author action.
- Notification-pending packages hide prepared downloads.
- Artifact query is scoped to current active editorial stage.
- Historical or superseded artifacts are suppressed.
- Download endpoint requires the artifact to be visible in current author context.
- Wrong artifact checksum holds.
- Approval of an older artifact version cannot approve the current stage artifact.

## Assessment

Artifact and version binding is proven by local regression and source inspection for current editorial author-review artifacts.
