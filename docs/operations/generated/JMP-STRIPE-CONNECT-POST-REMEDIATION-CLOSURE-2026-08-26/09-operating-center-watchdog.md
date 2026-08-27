# Operating Center Watchdog

Last Verified: 2026-08-27T01:06:22.788Z

| Item | State |
| --- | --- |
| Commissioning state | CONTROLLED_READBACK_READY |
| Suggested frequency | daily or before royalty setup adoption waves |
| Command | `node scripts/stripe_connect_post_remediation_closure.mjs --load-app-settings` |
| Completion metric | 3/56 |
| Same-day reminder guard | PASS |

## Alert Rules

- setup_complete_not_reflected_in_dataverse
- duplicate_stripe_account
- metadata_only_account_link_missing
- active_support_without_owner
- eligible_pending_cadence_after_founder_cadence_ruling
