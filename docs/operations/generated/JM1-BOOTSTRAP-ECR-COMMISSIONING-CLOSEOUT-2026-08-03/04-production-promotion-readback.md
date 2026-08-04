# Production Promotion Readback

## Status

PASS - PRODUCTION RELEASE READBACK CONFIRMED

Protected production promotion was executed through the governed GitHub Actions workflow after PR #405 merged.

## Protected Promotion Path

- Workflow run: `https://github.com/jmerrillorg/jmerrill-pub/actions/runs/30870655112`
- Trigger: `workflow_dispatch`
- Input: `deploy_production=true`
- Head SHA: `fdd01eff41f511f2f1d0970299e4127d34b4cbb8`
- Identity: OIDC / governed Azure workflow
- Local production credentials: 0

## Workflow Result

- Build immutable artifact: PASS
- Deploy App Service staging: PASS
- Staging health certification: PASS
- Promote staging to production: Azure reported an already-running `SwapSiteSlots` operation and returned workflow conclusion `failure`
- Production observation step: SKIPPED by workflow after the Azure concurrency response

## Production Readback

Direct production health readback after the protected workflow showed the intended production release:

- Production health: 200 / ready
- Production release: `fdd01eff41f511f2f1d0970299e4127d34b4cbb8`
- Dataverse: ready
- Graph: ready
- ACS: ready
- Author Portal: ready
- Payment gate: disabled

## Protected Route Readback

Unauthenticated probes returned 401:

- `/api/publishing/dispatch/author-package`: 401
- `/api/publishing/dispatch/author-package/certify`: 401
- `/api/publishing/executive-recovery/dispatch`: 401
- `/api/publisher/operating-center`: 401
