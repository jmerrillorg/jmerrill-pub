# Copy Author Gate

Last verified: 2026-08-14

## Rule

Copyediting cannot execute until Line Editing has a full author approval bound to the current approved Line Editing deliverable artifact.

## Runtime Support

Copyediting uses the same mandatory upstream author-gate evaluator and package/gate creation pattern.

Evidence source:

- `azure-functions/diagnostic-ai-runner/src/editorial/editorialAuthorGatePolicy.js`
- `azure-functions/diagnostic-ai-runner/src/editorial/editorialExecutionRuntime.js`
