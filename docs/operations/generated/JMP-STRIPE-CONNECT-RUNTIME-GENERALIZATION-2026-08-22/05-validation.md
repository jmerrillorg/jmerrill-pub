# Validation

Last verified: 2026-08-22T08:30:28Z

## Commands

```text
npm ci
node --test scripts/author_payout_enrollment_governance.test.mjs
npm run author-royalty-connect-migration-source-guard
npm run type-check
```

## Results

```text
author_payout_enrollment_governance.test.mjs:
14 / 14 PASS

author_royalty_connect_migration_source_guard.test.mjs:
3 / 3 PASS

type-check:
PASS
```

## Negative Proof

```text
existing_connect_accounts_replaced = 0
title_level_connect_accounts_created = 0
browser_posted_stripe_account_id_trusted = 0
stripe_payouts_created = 0
stripe_transfers_created = 0
stripe_payment_intents_created = 0
royalty_payables_created = 0
bill_com_disabled = 0
royalty_rates_changed = 0
contracts_changed = 0
author_invitations_sent = 0
pilot_authors_mutated = 0
human_review_exceptions_processed = 0
```

## Environment Note

`npm ci` completed with a Node engine warning because the current shell used Node v26.0.0 and the repository declares Node `>=24 <25`. Required checks passed after lockfile dependency installation.

