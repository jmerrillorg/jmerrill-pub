# Production Promotion Readback

## Status

PENDING - HUMAN REVIEW AND MERGE REQUIRED FIRST

The instruction requires human review before merging the focused hotfix PR. Protected production promotion was therefore not executed from this unmerged branch.

## Required Promotion Path After Merge

Use the existing governed workflow:

- Workflow: `Publishing App Service CI/CD`
- Trigger: `workflow_dispatch`
- Input: `deploy_production=true`
- Identity: OIDC / governed Azure workflow
- Local production credentials: 0

## Current Production Readback Before Hotfix Promotion

- Production health: 200 / ready
- Production release: `76ede371f22c59152f491848707df85ff6fced6f`
- Dataverse: READY
- Graph: READY
- ACS: READY
- Author Portal: READY

