# Dataverse Mapping

Last Verified: 2026-08-22T00:09:38Z

## Live Contact Fields Located

Read-only metadata inspection of the live `contact` table found these active Publishing/Stripe fields:

- `jm1pub_isauthor`
- `jm1pub_stripeconnectedaccountid`
- `jm1pub_stripeonboardingstatus`
- `jm1pub_stripepayoutsenabled`
- `jm1pub_stripedetailssubmitted`
- `jm1pub_striperequirementsdue`
- `jm1pub_stripelastverifiedat`
- `jm1pub_stripelastsyncresult`
- `jm1pub_stripemode`
- `jm1pub_stripechargesenabled`
- `jm1pub_stripepilotcohort`

Historical field names such as `jm1pub_stripeaccountid`, `jm1pub_stripekycstatus`, `jm1pub_stripeonboardingcompletedon`, and `jm1pub_billcomvendorid` were not usable in the live Contact `$select` attempted in this pass.

## Target Relationship

The migration must preserve:

```text
Author / Contact
→ one governed Stripe Connect payout relationship
→ many title royalty obligations
```

Stripe Connect identity belongs to the author relationship, not to each title.

## Required Writeback Before Broad Migration

Broad migration requires an idempotent writeback path for:

- Connect account created/reused
- onboarding link issued state
- onboarding status
- details submitted
- payouts enabled
- requirements due
- last verified timestamp
- migration batch
- exception state

No unstructured Contact notes should be used as the primary store for Connect readiness.

