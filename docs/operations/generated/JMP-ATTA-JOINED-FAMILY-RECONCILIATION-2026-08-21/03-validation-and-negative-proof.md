# Validation and Negative Proof

## Local Validation

| Check | Result |
| --- | --- |
| `node --test scripts/atta_joined_family_reconciliation_guard.test.mjs` | 8 / 8 PASS |
| `npm run type-check` | PASS |
| `node --test azure-functions/acs-email-relay/test/validation.test.js` | 41 / 41 PASS |
| `npm run build` | PASS, existing font warning only |

## Production Validation

| Check | Result |
| --- | --- |
| App Service deployment | PASS |
| Agreement reconciliation route | 200 / PASS |
| Reconciliation replay | 200 / PASS |
| Contract duplication | 0 duplicates; same contract reused |
| Joined-the-Family duplication | 0 duplicates; same event reused |
| Notification duplication | 0 duplicate business notifications; replay skipped as already sent |
| Referral | `NO QUALIFYING REFERRER` |

## Negative Proof

| Proof item | Result |
| --- | --- |
| `Atta_charged_again` | 0 |
| `Atta_repriced` | 0 |
| `Atta_migrated_to_new_6_percent_policy` | 0 |
| `Atta_schedule_recreated` | 0 |
| `signed_agreement_replaced` | 0 |
| `signed_agreement_regenerated` | 0 |
| `agreement_exists_but_system_still_reports_missing` | 0 |
| `duplicate_JOINED_THE_FAMILY` | 0 |
| `duplicate_workspace` | 0 |
| `duplicate_onboarding` | 0 |
| `duplicate_referral_credit` | 0 |
| `paid_in_full_after_first_payment` | 0 |
| `final_delivery_gate_cleared` | 0 |
| `manual_contract_upload_required_for_future_authors` | 0 |

## Remaining Onboarding Items

Onboarding is initiated but incomplete. The remaining required items are:

- author profile confirmation;
- production preferences;
- metadata/positioning confirmation;
- royalty/payment setup confirmation;
- workspace access confirmation.

Commercial production authorization is true. Operational production readiness remains dependent on completion/review of the required onboarding items.
