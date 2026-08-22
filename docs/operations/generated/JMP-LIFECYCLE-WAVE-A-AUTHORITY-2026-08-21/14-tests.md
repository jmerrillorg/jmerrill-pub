# 14 - Tests

## Focused Wave A

Command: `npm run jmp-lifecycle-authority-guard`

Result: PASS, 22 tests.

Coverage includes ten-stage registry, unique codes, stage contracts, sequencing, applicability, human gates, artifact preconditions, Waiting On, System Attention, Stage 10 persistence, legacy mapping, P0 conflict proofs, and human/machine canon pairing.

## Type Check

Command: `npm run type-check`

Result: PASS.

## Lint

Command: `npm run lint`

Result: PASS with existing warning in `app/layout.tsx` about custom fonts.

## Relevant Regression Guards

| Command | Result |
|---|---|
| `npm run p0-prospect-editorial-review-lifecycle-guard` | PASS, 7 tests |
| `npm run program006-dispatch-guard` | PASS, 19 tests |
| `npm run author-decision-propagation-guard` | PASS, 27 tests |
| `node --test scripts/atta_joined_family_reconciliation_guard.test.mjs scripts/publisher_today_read_model.test.mjs scripts/author_review_package_engine.test.mjs scripts/author_package_notification_engine.test.mjs` | PASS, 35 tests |

## CI Integration

`npm run jmp-lifecycle-authority-guard` is added to the App Service guard paths in:

- `.github/workflows/azure-app-service-premium.yml`
- `.github/workflows/azure-app-service-publishing.yml`
