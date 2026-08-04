# Staging Readback

## Staging Deployment

The PR #405 push-to-main workflow deployed the immutable App Service artifact to staging and completed staging health certification.

- Workflow: Publishing App Service CI/CD.
- Event: push to `main`.
- Run: `https://github.com/jmerrillorg/jmerrill-pub/actions/runs/30870187047`.
- Head SHA: `fdd01eff41f511f2f1d0970299e4127d34b4cbb8`.

## Live Readback

Readback on 2026-08-04:

- URL: `https://app-jm1-pub-prod-staging.azurewebsites.net/api/health`.
- HTTP: 200.
- Status: ready.
- Release: `fdd01eff41f511f2f1d0970299e4127d34b4cbb8`.
- Dataverse: ready.
- Graph: ready.
- ACS: ready.
- Author Portal: ready.
- Payment gate: disabled.
