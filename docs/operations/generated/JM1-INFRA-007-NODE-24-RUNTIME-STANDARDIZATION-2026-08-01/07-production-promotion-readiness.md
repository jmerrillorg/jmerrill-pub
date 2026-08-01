# Production Promotion Readiness

## Readiness

Production promotion is not authorized by this package alone.

Ready-for-review conditions for the App Service portion:

- Root app validates under Node 24.
- App Service CI workflow declares Node 24 and prints Node/npm versions.
- Publishing SWA: RETIRED UNDER JM1-INFRA-012.
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
7. Azure Functions host-runtime decisions remain separate future hosting-platform decisions before claiming every active compute surface is Node 24.

## Not Authorized

- Production slot swap.
- DNS change.
- Reopening Publishing SWA or restoring its retired workflow.
- Author communication.
- Publishing lifecycle advancement.
- Stripe, payout, refund, transfer, or Business Central posting.
