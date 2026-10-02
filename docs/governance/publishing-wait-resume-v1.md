# Publishing Wait Resume v1

Packet: JMP-PIPELINE-ORCHESTRATION-INTEGRATION-001. Continues PR #909; does not replace existing commissioning or author remediation packets.

## Ownership

Publishing owns the source wait, exact authority read, condition verification, lease, owner dispatch, retries, evidence and business result. jm1-ops owns scheduled observation and at-least-once dispatch requests. A successful queue POST is DISPATCH_REQUESTED, never RESUMED. Only a Publishing owner receipt proves resumption.

The control plane cannot specify a decision, stage, recipient, amount, folder, handler or arbitrary URL. It cannot create waits, write source state or reset failures. It has no access to author content. Receipt and health records are projections, not a second lifecycle authority.

## Wire Contract

UTF-8 JSON, exactly six fields; unknown fields rejected:

```json
{"schemaVersion":1,"eventType":"WAIT_RESOLVED","waitId":"00000001-1111-4111-8111-111111111111","sourceEventId":"resolved_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","owner":"jmerrillorg/jmerrill-pub","evidenceReference":"canonical-proof1"}
```

`waitId` is lowercase GUID. `sourceEventId` is `resolved_` plus SHA-256 of `waitId:idempotencyKey:evidenceReference`. Evidence is a nonempty, trimmed, single-line reference of at most 1024 characters. Publishing recomputes it from its current canonical condition reader before dispatch. Repeated delivery of the same signal is harmless; altered proof/replay is denied.

Publishing projects ready signals to `jm1-publishing-wait-projections/ready/{waitId}.json`. OPS reads them with Entra workload identity and sends raw UTF-8 JSON (XML-escaped in the Storage REST envelope) to Azure Storage queue `jm1-publishing-wait-signals`. This matches the existing Publishing host's `messageEncoding=none`; no base64 layer is added. It never writes the wait journal. Publishing's dedicated queue worker rechecks authority and condition. The existing broader stage queue is not enabled by this path.

The broader stage worker's WAIT_RESOLVED branch uses this same coordinator, versioned signal validator and runtime factory. It cannot bypass retry/proof guards through the older adapter-only route. Production wait dispatch still requires dedicated wait enablement; enabling the stage worker alone is insufficient. Removing a title from the scoped allowlist pauses queued resumes and reconciliation without altering its durable wait history. Scope restoration permits revalidation, not unconditional execution.

## Durable Behavior

- Wait producer is idempotent and rejects changes to the original authority tuple.
- Blob ETag compare-and-swap arbitrates claims; each claim has a new fencing ID and five-minute expiry. Business idempotency stays stable across attempts.
- The owning capability must be idempotent. Lease expiry alone does not prove exactly-once external effects.
- Failed attempts retain a safe error code, attempt count and exponential backoff, capped at one hour. Five failures require owner review.
- The five-minute reconciler scans all store pages, retries expired claims, recovers missing completion through the owner's idempotency and supersedes stale authority. It never manufactures approvals.
- Owner-authorized dead-letter recovery retains previous attempt/claim/failure history and requires a verified recovery evidence adapter. OPS cannot authorize recovery.
- Process-restart fixtures exercise the production wait-store adapter over a disk-backed Blob API double: owner failure, persisted backoff, process exit after owner effect but before worker receipt, expired-claim recovery with a new fence, and replay with one owner effect. These are representative human/system proofs, not live Azure acceptance.
- `health.json` and `receipts/{waitId}.json` expose failures and exact owner completion receipts. GitHub dispatch exceptions route to an existing-style work-packet exception issue.

## Existing Author Owner

`AUTHOR_REVIEW_RESPONSE` binds the existing `authorReviewResponseConsumer`. The wait path requires canonical contact/title/stage/gate/artifact/legacy-intake consistency, a verified correspondence sender, the original captured inbound event, exact reply headers, one verified delivery, exact artifact checksum and a non-stale delivery timestamp. Subject/title prose and quoted links do not establish the binding.

The consumer still performs classification and persists the actual reply; the integration supplies no decision, generates no reply and sends no mail. Its scoped conditional gate update uses the Dataverse ETag. A partial capture log is not a completion receipt. A different prior author decision is held, not overwritten. Existing package and payment consumers stay with their owners.

Correspondence identity is separately scoped `AUTHOR_CORRESPONDENCE_ONLY`, with the canonical-primary declaration source, timestamp and hash. No contact email2/email3 or portal login authority is changed. Source declaration recovery is fail-closed; arbitrary/quoted email addresses cannot authorize a new identity.

For historical cadence deliveries missing from the inbound delivery ledger, recovery requires the exact provider message in the reply headers, one shared-mailbox copy from the canonical ACS sender with the author recipient and Publishing CC, an exact canonical gate/stage/title/artifact, the original successful sent execution log, and the downloaded attachment checksum matching its manifest. The system registers that proven existing delivery; it does not send again. A missing or ambiguous proof remains held. Producer errors are isolated per source/gate and persisted in health while existing waits continue reconciling.

Other registered owner adapters use the same contract. Unregistered editorial, cover, payment, provider and general-stage owners fail closed. A provider/system fixture proves the contract, not live commissioning of those capabilities.

## Deployment and Cutover Gates

1. Review PR #909 and the linked jm1-ops change, reconcile current main and pass both validation suites. No merge or production deployment has been authorized merely by this document.
2. Provision only these runtime resources in `stjm1diagrunner`: private `jm1-publishing-stage-runtime`, private `jm1-publishing-wait-projections`, queue `jm1-publishing-wait-signals`. Preserve existing containers and evidence.
3. Reuse OPS workload client `92a4d69c-cc0d-4f33-adf7-cebd2c008936`, existing `JM1-Dev-Band2-Executor` federation. Approve only Storage Blob Data Reader at the projection container and Storage Queue Data Message Sender at the signal queue. No contributor, wait-journal write or Dataverse role.
4. Verify production Function identity can read canonical Dataverse/Graph and write its own wait resources. Verify the original Whole correspondence declaration and delivery headers/artifact binding through its authorized read path.
5. Deploy immutable reviewed Publishing artifact through protected `jmerrill-pub-production`; read `/api/health` and compare the expected SHA. Keep both worker flags off until prerequisite proof is complete.
6. Set `JM1_PUBLISHING_WAIT_TITLE_IDS` to reviewed canary title IDs and `JM1_PUBLISHING_WAIT_RUNTIME_ENABLED=true`. The original author timer defers only those exact titles; unrelated titles retain their current owner. Do not set `JM1_PUBLISHING_STAGE_RUNTIME_ENABLED`.
7. Configure OPS `JM1_PUBLISHING_WAIT_STORAGE_ACCOUNT=stjm1diagrunner`, then `JM1_PUBLISHING_WAIT_DISPATCH_ENABLED=true`. Observe an independently produced signal, owner dispatch, durable receipt, duplicate delivery, and next scheduled reconciliation.
8. Rollback: disable OPS dispatch first, then wait worker. Preserve waits/claims/receipts; inspect in-flight claims before returning a canary title to its previous timer. Never delete evidence or replay ambiguous effects.

No production PASS until both deployed readbacks, narrow RBAC, real owner receipt, retry/reconciliation and Whole binding are proven. Existing protected run 36933649885 is separate; it does not deploy this draft.
