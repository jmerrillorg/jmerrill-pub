# Revision Loop

Last verified: 2026-08-14

## Rule

Conditional approval, partial approval, approved-with-corrections, requested changes, and requested clarification are same-stage revision outcomes.

They do not authorize the next stage.

## Runtime Behavior

The author-gate policy classifies these decisions as returned-for-revision with `nextStageAuthorized: false`.

Evidence source:

- `azure-functions/diagnostic-ai-runner/src/editorial/editorialAuthorGatePolicy.js`
- `azure-functions/diagnostic-ai-runner/test/editorialAuthorGatePolicy.test.js`
