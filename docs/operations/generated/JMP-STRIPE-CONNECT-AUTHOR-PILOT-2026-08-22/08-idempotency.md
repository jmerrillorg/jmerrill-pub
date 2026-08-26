# Idempotency

Last Verified: 2026-08-26T14:39:18.126Z

| Control | State |
| --- | --- |
| Account create idempotency key | royalty-payee scoped |
| Account reuse before create | enforced |
| Existing account mismatch | fail closed |
| Link reissue behavior | same acct_* if later needed |
| Duplicate payout account prevention | enforced by identity search + metadata assertion |

Replay is expected to reuse the same account for each payee and issue a fresh Stripe-hosted onboarding link only when needed. The link is transient and not persisted.
