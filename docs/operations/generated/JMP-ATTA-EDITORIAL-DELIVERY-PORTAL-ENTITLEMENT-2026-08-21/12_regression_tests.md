# Regression Tests

Last Verified: 2026-08-21T23:59:00-04:00
Evidence Source: local repository test execution with Node 24.

| Check | Result |
| --- | --- |
| npm run type-check | PASS |
| npm run atta-editorial-delivery-entitlement-guard | 6 / 6 PASS |
| npm run author-auth-guard | 11 / 11 PASS |

## New Guard Coverage

- Optional portal access missing does not invalidate certified Editorial Review delivery.
- Joined-family author with active workspace but no scoped grant requires system attention.
- Scoped active grant clears missing-entitlement attention without binding other authors.
- Cross-author and cross-project grants do not satisfy Atta portal entitlement.
- Duplicate provisioning replay keeps one effective entitlement classification.
- Signed-in/consumed grant is treated as active author access.
