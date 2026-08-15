# Approval Path

Last verified: 2026-08-15T09:50:00-04:00

## Live Exercise

Not exercised with a new real author approval in this pass.

## Verified Existing Behavior

Regression tests verify:

- approval must be explicit;
- approval must bind to the exact artifact/checksum;
- superseded artifact approvals do not authorize movement;
- upstream author approval is required before later stage execution;
- the approval event consumer is the durable worker path, not a Publisher button or Cody session.

## Production State

The author-gated runtime is deployed and idempotent after canonical main redeploy. No next-stage authorization mutation was written during this commissioning pass.
