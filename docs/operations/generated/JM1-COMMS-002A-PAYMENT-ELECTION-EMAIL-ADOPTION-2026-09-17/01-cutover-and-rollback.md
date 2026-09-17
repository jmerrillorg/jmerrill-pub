# JM1-COMMS-002A Cutover and Rollback

## Cutover

1. Deploy the enterprise ACS relay package with exact-template authorization and retry-safe durable message reservations.
2. Deploy the diagnostic runner package with the payment-election consumer and managed-identity relay configuration.
3. Deploy the Publishing web runtime so future executed agreements can create marked payment-election action requests.
4. Enable `JM1_PAYMENT_ELECTION_COMMUNICATION_ENABLED=true` only in the diagnostic runner deployment settings.
5. Confirm there are no marked historical requests before activation and no Whole/Jackuline candidate.

There is no prior automatic sender to disable. Manual continuity remains an exception only. Recording `PAYMENT_ELECTION_COMMUNICATION_MANUALLY_FULFILLED` suppresses recovered automation for that requirement.

## Rollback

1. Set `JM1_PAYMENT_ELECTION_COMMUNICATION_ENABLED=false` on the diagnostic runner or restore the last-known-good runner package.
2. Leave business action requests and all communication evidence intact.
3. For urgent author service, inspect terminal communication evidence first. Send through the governed manual continuity path only when no accepted or waiting state exists.
4. Record `PAYMENT_ELECTION_COMMUNICATION_MANUALLY_FULFILLED` against the action request before re-enabling automation.
5. Re-enable only after the fault is corrected. Existing relay idempotency keys continue to prevent a second effect after ACS acceptance.

Rollback does not change agreement validity, payment-election logic, payment processing, or inbound reply processing.
