# Before You Were Born — Validation Record Classification

| Execution Log ID | Created | Classification | Notes |
|---|---|---|---|
| `ab48a205-7b9b-f111-b8dc-000d3a14673b` | 2026-08-19T03:06:54Z | **REAL_GOVERNING_CERTIFICATION** | The true, correct certification. Governing record. |
| `93febe11-7b9b-f111-b8dc-7c1e525b15c2` | 2026-08-19T03:07:11Z | **DUPLICATE_NON_GOVERNING** | Created by the idempotency bug during same-session replay testing before the fix landed. |
| `99153717-7b9b-f111-b8dc-00224820105b` | 2026-08-19T03:07:21Z | **DUPLICATE_NON_GOVERNING** | Same as above. |
| `8724b90c-7c9b-f111-b8dc-00224820105b` | 2026-08-19T03:14:19Z | **RECOVERY_VALIDATION_TEST** | Post-fix idempotency verification test; used a disposable test packageId but incidentally reused the real gate (gates are keyed by title+stage, not package version), transiently overwriting `jm1pub_awaitingsince`/`jm1pub_authordecisionsource`/`jm1pub_authorresponsesummary` with test-only values. |

**None deleted** — preserved as documented, non-governing evidence per this session's evidence-preservation practice. No canonical execution-log supersession mechanism was found in the codebase to formally mark them superseded; inventing one was out of scope for this pass (flagged, not built).

**Corrective action taken:** the gate (`e996abe7-2f8e-f111-8077-000d3a14673b`) was patched to restore the TRUE values from the governing record (`jm1pub_awaitingsince = 2026-08-19T03:06:54.452Z`, matching `ab48a205`'s recorded timestamp) after the test-pollution was discovered. This is a targeted restoration using real evidence already on record, not a guess.

**Final verified state:** `jm1pub_gatestatus = 196650002` (Awaiting Author Response), `jm1pub_nextstageauthorized = false`, `jm1pub_awaitingsince = 2026-08-19T03:06:54Z`.
