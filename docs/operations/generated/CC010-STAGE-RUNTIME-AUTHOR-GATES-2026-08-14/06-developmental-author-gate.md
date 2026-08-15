# Developmental Author Gate

Last verified: 2026-08-14

## Rule

Developmental Editing cannot execute until Editorial Review has a full author approval bound to the current approved Editorial Review deliverable artifact.

## Evidence

`findUpstreamApprovalEvidence` checks the prior Editorial Review stage for approved artifacts and approval gates. If the approval is not bound to the current artifact, Developmental Editing returns `BLOCKED_AUTHOR_APPROVAL_REQUIRED`.

Evidence source:

- `azure-functions/diagnostic-ai-runner/src/editorial/editorialExecutionRuntime.js`
- `azure-functions/diagnostic-ai-runner/test/editorialExecutionRuntime.test.js`
