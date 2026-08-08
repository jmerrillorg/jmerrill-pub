# Protected Production Deployment Proof

Last verified: 2026-08-08T05:12:00Z

## Result

Protected production deployment proof: BLOCKED.

## Blocker

GitHub Actions refused workflow dispatch because `publishing-power-platform-solution-deploy.yml` is not present on the default branch.

The branch contains the commissioned workflow, but GitHub requires a workflow file to exist on the default branch before `workflow_dispatch` can be invoked.

## Attempted Dispatch

| Field | Value |
| --- | --- |
| Workflow | `publishing-power-platform-solution-deploy.yml` |
| Ref | `codex/tranche1-commercial-foundation-implementation-20260807` |
| Approved source SHA | `3e66175a84c8fb438b0fcd3f240f61eb83e57e3f` |
| Target environment | `production` |
| Confirm | `true` |
| Result | `HTTP 404: workflow ... not found on the default branch` |

## Completed Before Blocker

- Deployment identity commissioned.
- GitHub environment `jm1-power-platform-production` created.
- Environment branch policy restricted to the PR branch.
- OIDC federated credential added to the existing deployment identity.
- Dataverse application user created in JM1-Core.
- `System Customizer` assigned.
- Workflow patched for exact solution, version, source SHA, target URL, environment ID, and organization ID validation.

## Not Completed

- Protected workflow run ID: NONE.
- Production import: NOT RUN.
- Production publish/readback: NOT RUN.
- Repeat-safe deployment validation: NOT RUN.

## Evidence

- `github-protected-workflow-dispatch-failure-2026-08-08.log`

Tranche 1 runtime implementation remains blocked.
