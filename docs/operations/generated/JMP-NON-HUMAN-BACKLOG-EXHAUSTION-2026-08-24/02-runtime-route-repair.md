# Runtime Route Repair

Last Verified: 2026-08-24T20:31:48Z

## Root Cause

Classification: `SIGNED_AGREEMENT_EVENT_EXISTS_BUT_PAYMENT_LOOKUP_ONLY_CHECKED_STRUCTURED_CONTRACT_ROW`

The existing payment-event consumer resolved agreement execution by querying `jm1pub_contracts` for a signed or active contract linked to the opportunity. It did not fall back to the governed `AGREEMENT_FULLY_EXECUTED` execution event that had already been written for Indomitable.

As a result:

1. `AGREEMENT_FULLY_EXECUTED` existed.
2. `PUBLISHING_INITIAL_PAYMENT_CONFIRMED` existed.
3. The payment route still returned `BLOCKED_AGREEMENT_NOT_EXECUTED`.

## Implemented Repair

File:

`lib/server/stripe/publishing-payment-event.ts`

Changes:

- Preserve the structured `jm1pub_contracts` lookup as the first agreement proof.
- Add governed execution-log fallback for `AGREEMENT_FULLY_EXECUTED` by opportunity source record.
- Materialize that event as signed agreement proof for payment-event gate evaluation.
- Request Dataverse formatted lookup labels in payment-event reads.
- Remove the hardcoded `Atta Darko` author fallback and replace it with formatted lookup labels, opportunity-name parsing, then generic `Author`.

## Regression Protection

File:

`scripts/atta_payment_event_recovery_guard.test.mjs`

Added assertions:

- payment consumer recognizes `AGREEMENT_FULLY_EXECUTED`;
- payment consumer recognizes `AGREEMENT_FULLY_EXECUTED_EVENT`;
- Dataverse reads request formatted lookup annotations;
- payment consumer no longer contains the hardcoded `Atta Darko` author fallback.

