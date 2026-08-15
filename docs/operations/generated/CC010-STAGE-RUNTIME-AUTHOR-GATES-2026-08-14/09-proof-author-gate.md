# Proof Author Gate

Last verified: 2026-08-14

## Rule

Proofreading cannot execute until Copyediting has a full author approval bound to the current approved Copyediting deliverable artifact.

## Final Approval Boundary

The final proofreading approval points to `PRODUCTION_HANDOFF`, but this runtime does not perform production handoff by itself.

Evidence source:

- `azure-functions/diagnostic-ai-runner/src/editorial/editorialAuthorGatePolicy.js`
