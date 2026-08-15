# Author-First Canon

Last verified: 2026-08-14

## Governing Rule

No governed editorial stage may advance because AI completed, QA completed, artifacts exist, staff reviewed, or a timer elapsed.

The required sequence is:

1. Editorial Review
2. Full author approval
3. Developmental Editing
4. Full author approval
5. Line Editing
6. Full author approval
7. Copyediting
8. Full author approval
9. Proofreading
10. Final full author approval
11. Production Handoff

## Runtime Enforcement

The executor enforces the rule by requiring an approved upstream gate before a downstream stage can run. The gate must be approved, author-decided, next-stage-authorized, and bound to the exact deliverable artifact with a checksum.

Evidence source:

- `azure-functions/diagnostic-ai-runner/src/editorial/editorialAuthorGatePolicy.js`
- `azure-functions/diagnostic-ai-runner/src/editorial/editorialExecutionRuntime.js`
