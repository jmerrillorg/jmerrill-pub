# Author Gate State Machine

Last verified: 2026-08-14

## Approved States

Full approval requires all of the following:

- gate status is approved;
- author decision is full approval;
- author decision timestamp exists;
- next stage authorized is true;
- gate deliverable artifact matches the artifact being relied on;
- artifact checksum exists;
- gate is not superseded.

## Non-Advancing States

The following do not authorize next-stage execution:

- awaiting author;
- response received without full approval;
- held;
- superseded;
- conditional approval;
- partial approval;
- approved with corrections;
- missing deliverable binding;
- missing checksum.

Evidence source:

- `azure-functions/diagnostic-ai-runner/src/editorial/editorialAuthorGatePolicy.js`
- `azure-functions/diagnostic-ai-runner/test/editorialAuthorGatePolicy.test.js`
