# Stale Guard Root Cause

## Classification

COMMISSIONING_GUARD_COUPLED_TO_HISTORICAL_MERGE_MESSAGE

## Root Cause

`scripts/jm1_commissioning_guard.test.mjs` required the current `origin/main` commit subject to match `Merge pull request #402`. That made a valid future merge, including PR #403, fail even when Bootstrap, ECR, workflow enforcement, and commissioning evidence were present.

The guard was validating a historical merge-message string instead of validating the commissioned production capabilities.

## Corrective Classification

CAPABILITY_BASED_MAIN_AUTHORITY_VALIDATION

## Corrective Action

The guard now validates:

- `HEAD` equals dynamically resolved `origin/main`.
- Bootstrap production control is present.
- ECR production control is present.
- Deployment workflow Bootstrap guard is present.
- Protected dispatch Bootstrap guard is present.
- Publishing ECR delegation is present.
- Commissioning evidence is present.

PR #402 and PR #403 remain allowed as evidence references, but neither PR number nor merge-message text is a runtime pass condition.

