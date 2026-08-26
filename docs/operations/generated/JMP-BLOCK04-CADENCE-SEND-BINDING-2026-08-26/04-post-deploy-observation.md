# Post-Deploy Observation and Selector Correction

Last Verified: 2026-08-26T09:34:51Z

## First Production Observation

PR #636 merged at:

`3200313b3b0fc7a2b2bcaabce17fae2197849310`

Production health returned:

- status: `ready`
- release: `3200313b3b0fc7a2b2bcaabce17fae2197849310`
- productionRelease: `3200313b3b0fc7a2b2bcaabce17fae2197849310`
- node: `v22.23.2`

The 2026-08-26T09:30Z cadence timer executed successfully:

- examined: `35`
- unique: `11`
- scheduled: `3`
- due-system-attention: `0`
- already-released: `4`
- mailbox-delivery-repaired: `1`
- author-responses-reconciled: `0`
- package-sent: `0`
- ambiguous: `0`
- non-sendable-or-blocked: `2`

## Fail-Closed Finding

The timer did not send The General's Will and Last Testament package because the live stage query did not select the canonical intake reference fields required by the send validator.

Dataverse execution log:

`PACKAGE_CADENCE_RELEASE_SEND_BLOCKED - Developmental Editing - The General’s Will and Last Testament`

Blocker:

`CANONICAL_INTAKE_REFERENCE_MISSING`

This was a selector/read-model defect, not an authorization to bypass the canonical-intake gate.

## Corrective Action

The stage query now selects:

- `jm1pub_intakereference`
- `jm1pub_publishingintakereference`

Regression test coverage now asserts these fields are present in the stage read used by the governed send path.

## Validation After Correction

- `npm run lint` in `azure-functions/diagnostic-ai-runner`: PASS.
- `node --test test/editorialCadenceReleaseConsumer.test.js` in `azure-functions/diagnostic-ai-runner`: 14 / 14 PASS.
- `npm test` in `azure-functions/diagnostic-ai-runner`: 2,121 / 2,121 PASS.

