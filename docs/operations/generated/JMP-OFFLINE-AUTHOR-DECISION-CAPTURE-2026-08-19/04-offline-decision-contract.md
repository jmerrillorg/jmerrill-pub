# Offline Decision Contract

## Preconditions (checked before recording)
1. Authenticated Publisher operator identity confirmed.
2. Exact target artifact identified, checksummed, and verified as the current, non-superseded version.
3. Decision + channel + decision-maker + recorder all supplied.
4. Explicit attestation: "I confirm that the author approved this exact version to proceed to the next stage."

## Write sequence
1. If the exact artifact isn't already a registered `jm1pub_editorialartifact`, register it first (real file, real checksum — never fabricated).
2. Patch the gate: `jm1pub_authordecision`, `jm1pub_authordecisionon`, `jm1pub_authordecisionsource`, `jm1pub_authorresponsesummary`, `jm1pub_deliverableartifactid`, and — only if Decision=Approve — `jm1pub_gatestatus`→Approved and `jm1pub_nextstageauthorized`→true.
3. If Decision is Request Revision / Request Clarification / Hold: `jm1pub_nextstageauthorized` stays/becomes `false`, gate stays open, notes preserved — the stage is NOT closed.
4. If Decision = Approve: close the current `jm1pub_editorialstage` (`jm1pub_stagestatus`→Complete).
5. Write one `jm1_executionlogs` record with a stable idempotency key (`author-decision-capture:<gateId>:<artifactChecksum>`) as the first sentence of the description (matching the truncation-safety fix from PR #518 — the same lesson applies here).

## Idempotency
Same gate + same artifact + same decision event → the idempotency key is stable and reusable for a future dedicated lookup function, matching the pattern already proven correct in `publishing-dispatch-service.ts`. This pass did not build the automated lookup/replay-guard function itself (see 08-regression-tests.md for what's covered vs. deferred) — the key is written correctly so that function can be added without re-touching this record.

## Conflict detection
Not implemented as an automated check in this pass — flagged as a real gap in 08-regression-tests.md. If a later email arrives disagreeing with a recorded verbal decision, `authorReviewResponseConsumer.js` would currently overwrite the gate fields without knowing they were populated via offline capture, since offline captures use the exact same fields email decisions use. This is the honest state of the system after this bounded change, not a claim that conflict detection now exists.
