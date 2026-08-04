# Staging Deployment Readback

## PR #405 Push-To-Main Workflow

The PR #405 push-to-main workflow completed successfully for staging:

- Build: PASS
- Staging deployment: PASS
- Staging health certification: PASS
- Staging release: `fdd01eff41f511f2f1d0970299e4127d34b4cbb8`
- Production promotion in that push workflow: SKIPPED BY DESIGN

## Direct Staging Health Readback

- URL: `https://app-jm1-pub-prod-staging.azurewebsites.net/api/health`
- HTTP: 200
- Status: ready
- Release: `fdd01eff41f511f2f1d0970299e4127d34b4cbb8`
- Dataverse: ready
- Graph: ready
- ACS: ready
- Author Portal: ready
- Payment gate: disabled
