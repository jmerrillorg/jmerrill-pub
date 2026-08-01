# Production Promotion Readiness

## Readiness

Production promotion is not authorized by this package alone.

Ready-for-review conditions for the App Service portion:

- Root app validates under Node 24.
- App Service CI workflow declares Node 24 and prints Node/npm versions.
- Static Web Apps preview workflow declares Node 22 because SWA deploy does not yet support Node 24.
- App Service Bicep declares `NODE|24-lts` and `~24`.
- Function packages pass local validation under Node 24, but live Function host runtime remains an exception.
- Evidence package and checksums validate.
- No active Node 20 runtime authority remains in source.

## Production Gates

Before production runtime promotion:

1. PR review and required checks pass or receive governed disposition.
2. Staging slot reports Node 24.
3. Staging `/api/health` is ready at the certified head SHA.
4. Rollback path remains available.
5. Jackie authorizes production App Service runtime update and/or slot swap.
6. Function App runtime remediation is completed separately before claiming estate-wide Node 24 completion.
7. Static Web Apps preview dependency is retired or Microsoft adds Node 24 support before claiming every active CI/deployment surface is Node 24.

## Not Authorized

- Production slot swap.
- DNS change.
- Static Web Apps retirement.
- Author communication.
- Publishing lifecycle advancement.
- Stripe, payout, refund, transfer, or Business Central posting.
