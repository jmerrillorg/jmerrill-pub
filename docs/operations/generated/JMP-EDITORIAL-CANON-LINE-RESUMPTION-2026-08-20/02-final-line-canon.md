# Final Line Canon

Last verified: 2026-08-20T13:22:13Z

## Operating Rule

Line Editing may run only from the exact author-approved Developmental artifact. It must preserve author voice, apply Line Editing scope only, avoid Developmental restructuring, avoid Copyediting drift, and produce a true Line artifact for author review.

## Required Line Runtime Behavior

- Provider route: Claude through Microsoft Foundry.
- Fallback: not permitted silently.
- Source: exact upstream author-approved Developmental artifact.
- Output: model-produced Line edited manuscript must be persisted; model output may not be discarded.
- Retention/drift QA: approximately 95% to 100% retained content window.
- Gate: author review gate must be created after package-grade Line output.
- Next stage: Copyediting is blocked until exact Line artifact author approval.

## Evidence Sources

- `azure-functions/diagnostic-ai-runner/src/editorial/editorialExecutionRuntime.js`
- `azure-functions/diagnostic-ai-runner/src/editorial/editorialAuthorGatePolicy.js`
- `azure-functions/diagnostic-ai-runner/test/editorialExecutionRuntime.test.js`

