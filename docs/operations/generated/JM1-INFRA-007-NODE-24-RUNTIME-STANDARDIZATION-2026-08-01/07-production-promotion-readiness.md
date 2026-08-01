# Production Promotion Readiness

## Readiness

Production promotion is not authorized by this package alone.

Ready-for-review conditions after staging certification:

- Root app validates under Node 24.
- CI workflows declare Node 24 and print Node/npm versions.
- App Service Bicep declares `NODE|24-lts` and `~24`.
- Function packages declare Node 24 compatibility and pass local validation.
- Evidence package and checksums validate.
- No active Node 20 runtime authority remains in source.

## Production Gates

Before production runtime promotion:

1. PR review and required checks pass or receive governed disposition.
2. Staging slot reports Node 24.
3. Staging `/api/health` is ready at the certified head SHA.
4. Rollback path remains available.
5. Jackie authorizes production App Service runtime update and/or slot swap.

## Not Authorized

- Production slot swap.
- DNS change.
- Static Web Apps retirement.
- Author communication.
- Publishing lifecycle advancement.
- Stripe, payout, refund, transfer, or Business Central posting.

