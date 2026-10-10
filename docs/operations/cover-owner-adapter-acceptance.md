# Cover owner adapter acceptance

This is an internal commissioning capability, not approval to produce a title,
call a paid model, approve a cover, submit metadata or advance a stage.

## Owning runtime

The existing `reconcile-publishing-waits` timer dispatches the cover owner only
when `JM1_TITLE_COMMISSIONING_COVER_ENABLED=true`. Its title allowlist is bounded
to the five Jackie-title commissioning IDs. Generation separately requires
`JM1_COVER_GENERATION_ENABLED=true`, current native source and identity proof,
an exact current approved print interior, and a recorded, bound spend decision.
Missing inputs fail closed. Received originals and held reviews are not approval.

Private durable state resides in the existing `jm1-publishing-stage-runtime`
container under `publishing/cover/owner/v1`. Requests, authorities, execution
claims, provider intents, independent provider receipts, assets, review packages
and completion receipts have separate namespaces and checksum bindings. A lost
response cannot initiate a second provider call. Unknown provider outcomes remain
held after bounded reconciliation attempts. Expired claims recover by ETag CAS.

## Controlled acceptance

`JM1_COVER_ADAPTER_ACCEPTANCE_ENABLED` defaults off. The function-key protected
POST `/api/publishing/commissioning/cover-adapter-acceptance` accepts only one
field, `action`, with `SEED`, `READ` or `DISPATCH`. It cannot accept a customer,
title, source URL, approval, prompt or arbitrary scenario. The fixed five cases
use synthetic local bitmap images, never Foundry or any paid provider.

The namespace `publishing/cover/acceptance/v1` is isolated from real owner state.
Synthetic authority is rejected by the production owner store. The cases prove
normal completion, lost response with durable receipt, unknown outcome, denied
authority and expired claim. This proves deployed adapters only, not actual
creative quality, real-title readiness, SharePoint delivery or publication.

## Protected acceptance sequence

1. Review the exact PR head, full tests, CI artifact and concurrent release state.
2. Deploy that reviewed canonical artifact through existing protected controls.
3. Verify release SHA and health; keep real cover generation, broad stage, wait
   dispatch and editorial execution disabled.
4. Temporarily enable only the fixed-fixture acceptance flag and seed once.
5. Independently read private Blob state, hashes and ETags. Observe a natural
   existing timer tick, then expired-claim recovery after the five-minute lease.
6. Read again and replay completed fixtures; require unchanged files and receipts,
   no second call for a persisted intent, and no execution for denied authority.
7. Disable acceptance, read settings back and preserve all synthetic evidence.

Any failure blocks acceptance. Disable the acceptance flag and real cover flags
without deleting durable records. Inspect in-flight claims before any rollback.
Restore the previously verified canonical artifact only through protected
deployment; do not restore stale settings wholesale or replay paid intents.

## Remaining real-title gates

Real-title cover production additionally requires approved source/review/interior
authority, authenticated exact spend authority and tariff, current native layout
geometry, governed SharePoint review-package destination, and creative review.
No synthetic receipt satisfies these gates. All non-Jackie titles stay manual.
