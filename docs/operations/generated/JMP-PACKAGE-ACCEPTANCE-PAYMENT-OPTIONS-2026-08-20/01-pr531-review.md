# PR #531 Review

Last verified: 2026-08-20

## GitHub State Before Merge

- PR: #531
- Title: `JMP: Add canonical author offer engine`
- Prior head: `3b5123145f8015a4fbec41cf60dd284c7773b39a`
- State before remediation: OPEN / non-draft / CONFLICTING
- Conflict source: `azure-functions/diagnostic-ai-runner/package.json`

## Rebase / Correction

The branch was rebased onto current `origin/main`.

Resolved:

- Preserved current main lint coverage.
- Added #531 engine and payment mapping files to lint coverage.
- Corrected locked snapshot vocabulary from `LOCKED_PREVIEW` to `PRICING_LOCKED`.

Validated head before merge:

- `b54de42fa680bdd9b52b4d4ae81c2d69250c39f1`

## Confirmed Behaviors

| Requirement | Result |
| --- | --- |
| Package catalog reuse | PASS |
| Loyalty tiers 0 / 10 / 15 / 20 | PASS |
| Referral availability/cap logic | PASS |
| 50% combined cap | PASS |
| 4% fee per multi-pay transaction | PASS |
| Tax external | PASS |
| Deterministic cent allocation | PASS |
| Stripe adapter consumes Offer Engine output | PASS |
| Atta arrangement untouched | PASS |
| Preview vs locked vocabulary | PASS after correction |

## Validation

Command:

```text
npm test -- test/authorOfferEngine.test.js test/agreementPaymentLinkMapping.test.js
npm run lint
```

Result:

- Engine/payment tests: 33 / 33 PASS.
- Lint: PASS.

## Merge

- Merge SHA: `361718f3548280ed1204154e610dafc639fc5e3f`
- Deployment: NOT EXECUTED.
- Live automatic author sends: 0.
