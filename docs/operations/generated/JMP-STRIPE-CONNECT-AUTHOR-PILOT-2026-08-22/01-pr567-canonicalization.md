# PR #567 Canonicalization and Runtime Dependency

Last Verified: 2026-08-22T11:59:59.764Z

PR #567 was merged before pilot execution and established the generalized author/payee Stripe Connect enrollment runtime. The protected execution route was added afterward through PR #569 and deployed to production before dry-run or live execution.

| Item | Evidence |
| --- | --- |
| PR #567 runtime | MERGED before pilot execution |
| PR #569 protected route/workflow | MERGED; production release a49f3b29b7d0c9d2f94cd6b459f2b0b5813c9eba |
| PR #570 account-create payload fix | MERGED; production release 6de0874c7538dea37d7e09512bbcb1e6756e9968 |
| PR #571 account-listing reuse fix | MERGED; production release a88ed603942afca2242af6b776c05d99648edc44 |
| PR #572 duplicate-proof reporting fix | MERGED; production release 2e3950223aeefc6e3bbef0c076d4f07eac04dec1 |
| Production health at pilot execution | READY; stripeEnrollment READY; paymentGate disabled |

The pilot did not execute from an unmerged branch or local credentials. Live execution used the deployed production route and GitHub Actions OIDC identity for environment jmerrill-pub-production.
