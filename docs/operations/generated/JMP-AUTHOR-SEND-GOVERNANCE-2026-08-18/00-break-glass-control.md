# Author-Facing Send Dispatch — Break-Glass Control

Established 2026-08-18, following the Before You Were Born / The Long Watch corrected-delivery recovery.

## Normal path (required)

All author-facing sends go through the **Publisher Operating Center** control plane
(`https://jmerrill.pub/publisher/operating-center`), authenticated as a governed
publisher operator. The Operating Center is responsible for invoking the governed
relay (`send-approved-author-response`) with a payload built through the canonical
renderer (`renderJm1EnterpriseCommunication`) and recording the resulting execution
log through `authorResponseSendPersister.js`.

## Break-glass path (exception only)

Direct dispatch to the relay endpoint using a Key Vault-sourced relay key —
bypassing the Publisher Operating Center UI — is **not a normal send path**. It
exists only as a documented exception for when the control plane is
independently confirmed unreachable and a certified, already-authorized send
cannot reasonably wait.

A break-glass send is valid only when ALL of the following are recorded, before
or immediately after dispatch:

| Requirement | Must record |
|---|---|
| Named human authorization | Who explicitly authorized this specific send, and when |
| Reason | Why the normal control plane could not be used |
| Exact recipient(s) | — |
| Exact certified artifact(s) | File names + checksums |
| Timestamp | Of dispatch |
| Provider evidence | HTTP status + response body |
| Mandatory post-event reconciliation | Execution log persisted through the canonical persister service using the correct source-entity mapping — not hand-edited fields |

## 2026-08-18 incident record (retroactive)

Two sends were dispatched via this break-glass path because the Publisher
Operating Center's authentication was down for the entire session in which
the sends were authorized (root cause: App Service Managed Identity not
enabled, fixed same session — see `JMP-FIVE-PROJECT-EXECUTION-RECOVERY-2026-08-17/`
evidence). By the time authentication was restored, the automated tooling
available in that session could not reach an authenticated browser context
to use the now-working UI, and further delay was judged worse than the
governance exception.

| Field | Before You Were Born | The Long Watch |
|---|---|---|
| Authorized by | Founder, explicit chat authorization, 2026-08-18 | Founder, explicit chat authorization, 2026-08-18 |
| Recipient | scrowley50@gmail.com | chosen2k7@gmail.com |
| Artifacts | before-you-were-born-Author-Review-Manuscript.docx (sha256 `da5684ec...`), before-you-were-born-Editorial-Review-Guide.pdf (sha256 `2d80ed45...`) | the-long-watch-Author-Review-Manuscript.docx (371,556 bytes), the-long-watch-Editorial-Review-Guide.pdf (3,458 bytes) |
| Dispatch timestamp | 2026-08-18 (session timestamp) | 2026-08-18 (session timestamp) |
| Provider evidence | HTTP 202, `accepted:true`, `deliveryStatus:AUTHOR_RESPONSE_SENT` | HTTP 202, `accepted:true`, `deliveryStatus:AUTHOR_RESPONSE_SENT` |
| Post-event reconciliation | **Complete** — `jm1_executionlogs` record `5faba2c5-6e9b-f111-b8dc-6045bdd69435` persisted via `authorResponseSendPersister.js` logic against real `jm1pub_editorialdiagnostic` record `e71ea2ef-3b7c-f111-ab0f-6045bdd69435` | **Held** — no `jm1pub_editorialdiagnostic` record exists for this title; persisting with a substituted ID would create a schema-mismatched record. See PR #517 for the fix required first. |
| Gate status reconciliation | **Outstanding** — `jm1pub_editorialapprovalgateid e996abe7-...` still reads `196650001` ("Ready for Author Review") as of this record; correct value is `196650002` ("Awaiting Author Response"), but no canonical gate-transition service was located for this scenario — not hand-written | **Outstanding** — same, plus blocked on the diagnostic-record gap above |

## Classification

Both sends: **DELIVERY VALID / GOVERNANCE PATH EXCEPTION**. Materials reached
the authors and were independently certified before dispatch. The normal
control-plane send workflow is not yet proven commissioned end-to-end by
these two events.

---

## 2026-08-19 Addendum — Canonical Gate-Transition Reconciliation

### Canonical service identified

`lib/server/publishing-dispatch-service.ts` — `certifyOperationalDelivery()` is the real, reusable (Developmental/Line/Copy/Proof-agnostic) gate-transition service. Direct precedent: "Before You Were Born" is registered in `five-title-executive-recovery-dispatch.ts`'s allowlist for exactly this dispatch path. Defect classification: `SERVICE_EXISTS_NOT_CALLED`.

### Gap found and fixed (PR #518)

`certifyOperationalDelivery()`'s idempotency check requires a prior `PUBLISHING_DISPATCH_TECHNICALLY_RELEASED` execution log, which is normally written only as a side effect of `dispatchAuthorPackage` actually sending an email — there was no honest way to record real already-happened delivery evidence without resending. Added `recordExternalDeliveryEvidence()`, which writes the identical evidence shape without ever calling the send path. See PR #518.

### Second, more serious bug found and fixed (same PR)

While live-verifying the new function against real Dataverse data, discovered that `writeExecutionLog`'s 1000-char description truncation (`safeDetail()`) cut off the idempotency key, which was written near the *end* of each description. This meant `findTechnicalReleaseLog`/`findOperationalCertificationLog`'s `contains()` lookup could never match a prior write — **every replay of `dispatchAuthorPackage`/`certifyOperationalDelivery`/`recordExternalDeliveryEvidence` silently duplicated the execution log and reset the review-clock start (`jm1pub_awaitingsince`)**. This is a systemic defect likely affecting any title/stage whose natural key pushes the description past ~800-900 characters of preamble, not specific to this reconciliation. Fixed by moving the idempotency key to the first sentence of all three affected description writes.

**Confirmed live**: reconciling Before You Were Born's gate hit this exactly — 3 duplicate `PUBLISHING_DISPATCH_OPERATIONALLY_CERTIFIED` execution logs were created (`ab48a205-...` true original, then `93febe11-...` and `99153717-...` duplicates from replay/idempotency-testing) before the fix landed, each resetting `jm1pub_awaitingsince`. A further transient pollution occurred when the post-fix verification test reused the same real gate (gates are keyed by title+stage, not by package version) and briefly overwrote `jm1pub_awaitingsince`/`jm1pub_authordecisionsource`/`jm1pub_authorresponsesummary` with test-only values.

**Corrective action taken** (documented here for full transparency — this is a targeted restoration of the true original value using real evidence already on record, not a guess): `jm1pub_awaitingsince` was patched back to `2026-08-19T03:06:54.452Z` (the timestamp recorded in the true original, first-and-correct execution log `ab48a205-7b9b-f111-b8dc-000d3a14673b`), and `jm1pub_authordecisionsource`/`jm1pub_authorresponsesummary`/`jm1pub_correlationid` restored to reference that same true event. The duplicate execution logs (`93febe11-...`, `99153717-...`, and the disposable test-only log `8724b90c-...`) were left in place as evidence rather than deleted, consistent with this session's "never delete evidence" practice — they are harmless audit-log noise, now explained.

### Before You Were Born — final state (verified via direct Dataverse readback)

| Field | Value |
|---|---|
| `jm1pub_gatestatus` | `196650002` (Awaiting Author Response) |
| `jm1pub_nextstageauthorized` | `false` |
| `jm1pub_awaitingsince` | `2026-08-19T03:06:54Z` (true, corrected value) |
| Governing execution log | `ab48a205-7b9b-f111-b8dc-000d3a14673b` |

### The Long Watch — held

Per plan: execution-log persistence and gate-transition reconciliation for The Long Watch are held until PR #517 (source-entity polymorphism fix) is reviewed and merged — it has no `jm1pub_editorialdiagnostic` record, so its execution log must use `sourceEntity: "jm1pub_title"`, which #517 enables. As of this writing, PR #517 is open, not yet merged.

### Break-glass incident status

Both sends remain classified `DELIVERY VALID / GOVERNANCE PATH EXCEPTION` — this reconciliation does not reclassify them as normal control-plane proof. Before You Were Born's post-event reconciliation is now **complete**. The Long Watch's remains **open**, blocked on PR #517.
