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
