# Operating Center Readiness

Last Verified: 2026-08-22T00:09:38Z

## Required Visibility

The Publisher Operating Center should expose author royalty-payee readiness without exposing private banking or tax data:

```text
Royalty Payee System
Stripe Connect Account
Connect Status
Onboarding Status
Payouts Enabled
Requirements Due
Ready for Royalties
Last Invite
Last Reminder
Exception
```

## Current State

The required field concepts exist in live Dataverse metadata for Stripe account/status/readiness, but the broad migration read-model and exception queue are not yet proven for the 70-row Bill.com batch.

Operating Center readiness:

```text
PARTIAL / NOT READY FOR FULL BATCH
```

