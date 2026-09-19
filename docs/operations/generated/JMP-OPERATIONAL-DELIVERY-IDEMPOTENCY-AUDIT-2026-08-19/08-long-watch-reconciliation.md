# The Long Watch — Reconciliation Record

## Provenance
- `sourceEntity: "jm1pub_title"`, `sourceRecordId: "a69b9dfa-bb7b-f111-ab0f-7c1e525b15c2"` — via PR #517's fix. No fake `editorial_diagnostic` record was created.

## Execution logs (real, via merged origin/main code)
| Log | Type | ID |
|---|---|---|
| Author-response audit log | `AUTHOR_RESPONSE_SENT` (via `authorResponseSendPersister.js`) | `cb7e1141-f79b-f111-b8db-7c1e52823892` |
| Technical release | `PUBLISHING_DISPATCH_TECHNICALLY_RELEASED` (via `recordExternalDeliveryEvidence`) | `8fcd1369-889b-f111-b8dc-6045bdd69738` |
| Certification pending | `PUBLISHING_DISPATCH_OPERATIONAL_CERTIFICATION_PENDING` | `977b186d-889b-f111-b8dc-000d3a14673b` |
| Governing certification | `PUBLISHING_DISPATCH_OPERATIONALLY_CERTIFIED` (via `certifyOperationalDelivery`) | `29193c6a-889b-f111-b8dc-6045bdd69678` |

## Gate: `f79d9b13-688e-f111-8077-000d3a14673b`
| Field | Value |
|---|---|
| `jm1pub_gatestatus` | `196650002` (Awaiting Author Response) |
| `jm1pub_nextstageauthorized` | `false` |
| `jm1pub_awaitingsince` | `2026-08-18T21:00:00Z` — corrected to the true break-glass delivery timestamp (see note below) |

## Important finding: `certifyOperationalDelivery()` does not honor `externalDeliveryTimestamp` for the review-clock field

`certifyOperationalDelivery()` always writes `jm1pub_awaitingsince = new Date().toISOString()` (i.e. "now", the moment certification runs) — the `externalDeliveryTimestamp` passed to `recordExternalDeliveryEvidence()` only appears in the execution-log *description text*, not in the field that actually drives the seven-day response window. On first run this produced `2026-08-19T04:42:49Z` (reconciliation time), not the true 2026-08-18 delivery time — a direct violation of "do not use the current reconciliation timestamp as the review start."

**Corrected**: patched `jm1pub_awaitingsince` to `2026-08-18T21:00:00Z`, the recorded `approvedOn`/delivery-evidence timestamp from the actual break-glass relay payload — the most precise delivery-time evidence on record (not an independently-observed provider timestamp, since the ACS 202 response body carried no timestamp field; flagged as such rather than overstated).

**This same gap affects Before You Were Born.** Its `jm1pub_awaitingsince` (`2026-08-19T03:06:54Z`) is *also* reconciliation-time, not true 2026-08-18 send-time — I did not correct it in this pass because the operating instructions for this turn explicitly expected that exact value to persist unchanged, creating a direct conflict with the "use real delivery timestamp" principle if applied consistently. **Flagging this for an explicit decision rather than resolving it unilaterally** — see final response.

This is a real architectural gap worth a proper fix (an optional `reviewStartOverride` parameter on `certifyOperationalDelivery`) rather than a repeated manual patch — flagged as follow-up, not fixed as part of this already-large pass.

## Idempotency proof (no relay call)
Ran `recordExternalDeliveryEvidence` + `certifyOperationalDelivery` a second time with identical inputs: both returned `idempotent`. Gate readback confirmed byte-identical (`etag` unchanged) before and after. Exactly one `PUBLISHING_DISPATCH_OPERATIONALLY_CERTIFIED` log exists for this package's idempotency key. No relay was called; no email was sent.

## Readback
**API-verified only** — direct Dataverse query. Operating Center UI not rendered visually (browser-auth isolation unresolved this session); stating this explicitly rather than claiming visual proof.
