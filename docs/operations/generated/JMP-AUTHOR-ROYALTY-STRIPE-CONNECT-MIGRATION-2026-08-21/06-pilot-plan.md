# Pilot Plan

Last Verified: 2026-08-22T00:09:38Z

## Planned Batch

Migration batch:

```text
JMP_AUTHOR_ROYALTY_CONNECT_MIGRATION_2026_08
```

## Current Readiness

The source and Dataverse readback do not support a 3-5 author clean pilot yet:

| Pilot category | Current count |
| --- | ---: |
| Clean create candidate | 1 |
| Existing Connect account candidate | 3 |
| Duplicate-email review | 2 |
| Data-quality hold | 64 |

The previous payout-enrollment pilot sequence in `JM1-PAY-001` remains relevant evidence, but this Bill.com batch cannot reuse those names blindly unless the current source rows reconcile to the same governed Contacts and Connect accounts.

## Pilot Gate

Before pilot send:

1. Resolve the 64 email-mismatch rows or deliberately limit the pilot to the 1 clean create candidate plus any existing-account candidates that pass ownership/readback.
2. Confirm the account type remains Standard under current canon.
3. Confirm Connect status readback and Dataverse writeback for account lifecycle.
4. Confirm invitation renderer and archival redaction.
5. Validate no cross-author link leakage.

