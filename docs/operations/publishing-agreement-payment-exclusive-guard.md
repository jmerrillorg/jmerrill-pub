# Agreement Payment Exclusive Guard

Owner: existing Publishing financial/payment runtime.
Packet: JM1-VERTICAL-OPERATING-COMMISSIONING-001.
Related financial authority: JMP-ATTA-PROVIDER-SAFE-TAIL-ADJUSTMENT-001.

## Scope and proof boundary

This change serializes cooperating JM1 producers for one canonical agreement.
It does not pause Stripe settlement, bank activity, external operators or a
previously deployed process. It is not proof that Atta's tail has been changed.
No financial policy, approved schedule request, payment allocation, reminder,
author correspondence or September correction is changed by this release.

The runtime is the Premium App Service `app-jm1-pub-prod-v2`, deployed by
`.github/workflows/azure-app-service-premium.yml`. A diagnostic Function release
does not deploy these handlers. Do not reuse superseded Function runs.

## Durable protocol

`DataversePaymentGuardStore` reuses `jmpv2_paymentevidences` with only existing
read/create privileges. No table, field, identity, role or permission is added.
Financial hydration continues to read only PAYMENT and REFUND events.

- PAYMENT_MUTATION_INTENT permanently binds agreement, operation kind/ID and
  canonical payload hash. Altered replay is rejected even after later claims.
- PAYMENT_MUTATION_GUARD is an append-only chain. Each transition's primary GUID
  is deterministic from guard version, agreement GUID and next revision.
- Competing writers must create the same next primary key. Only one can win.
  Every node is its own immutable receipt and contains the previous node hash.
- Reads follow all pages, reject incomplete/broken chains and cross-origin
  continuation URLs, and fail closed at the bounded pagination limit.
- Work begins only after the exact claim owner and fingerprint are read back.
- Completion appends RELEASED. Timeout, throw or ambiguous payoff appends
  RECOVERY_REQUIRED when storage is available; otherwise HELD remains blocking.
- No claim expires into permission to write. Stripe cannot fence an old request
  using a Dataverse token. A stale claim requires proof of producer quiescence,
  current provider and ledger readbacks, and authorized recovery disposition.
- Recovery checks exact claim and payload, uses the existing owner's evidence
  verifier, and appends a release. It never deletes or rewrites evidence.

All payment/refund handlers, recurring collections and additional checkout use
this guard. The recurring list is only a candidate list; eligibility is reread
inside the claim. Production financial write adapters also require an active,
agreement-bound async execution context. Busy/recovery/store failures return
non-success to webhook delivery so they cannot be acknowledged as completed.
QBO-only reconciliation failures retain their existing durable retry semantics;
they do not invent a new Stripe balance effect or unnecessarily freeze claims.

## Schedule-owner integration

`executeGovernedScheduleMutation` is an internal integration wrapper, not a new
HTTP endpoint or billing engine. The existing owner must supply:

1. A verified authority reference and exact approved request hash.
2. An exact-binding durable completion reader with fresh independent readback.
3. A complete fresh preflight inside the exclusive claim.
4. The approved provider write, independent provider verification, audited
   future Dataverse projection, and final verification as one awaited operation.

On provider success/projection failure, throw and retain the claim. Recovery
reconciles the projection forward; it does not restore an oversized provider
tail or submit another independent obligation. An existing verified completion
returns without repeating provider/projection effects. Guard claim receipts
are operational history, not duplicate payment events or financial audits.

The guard does not authorize the owner callbacks. No new public recovery or
schedule-write endpoint is introduced, and no caller-supplied boolean may stand
in for the owner's actual approval/quiescence/provider evidence resolver.

## Reviewed rollout and acceptance

1. Review this PR, run payment CI, typecheck and production build. Resolve normal
   repository and release approval before merge/deployment. Lack of a configured
   GitHub reviewer rule is not evidence of founder approval.
2. Verify canonical paymentevidence is a standard table with unique primary IDs
   and that the deployed identity can read/create guard-only evidence. Do not
   expand grants if these checks fail.
3. Deploy the exact reviewed main artifact by the Premium App Service workflow.
   Drain old application instances/in-flight financial handlers before declaring
   all producers guarded. Keep recurring collection disabled as it is today.
4. Check `/api/health` release SHA and `exclusiveGuardVersion`. The separate
   `exclusiveGuardProof` value deliberately does not claim live commissioning.
5. Under approved non-financial acceptance scope, use the same deployed guard
   code/store and independent workers to demonstrate one winner, payment/refund
   contention, complete persisted chain, restart, duplicate request rejection,
   ambiguous-result hold and evidence-verified recovery. Use no live invoice,
   charge, refund, author communication or financial projection as a test.
6. Capture request/claim IDs, timestamps, chain revisions/hashes, busy result,
   final release, app SHA and independent observer readback. A memory fixture
   or a source test is not this live proof.
7. Only after live proof, the existing financial owner can run Atta's already
   approved exact request with unchanged fresh preflight. Preserve the payload,
   key and pinned API version in the authority package. No repeated financial
   approval is needed for that unchanged plan; a changed preflight stops it.

## Failure containment and rollback

Do not delete a HELD/RECOVERY_REQUIRED node, steal its revision or fall back to
an unguarded writer. Preserve all evidence. Stop new financial execution through
existing owner controls, retain Stripe events for retry, drain old processes,
and inspect claims. Reverting to an older unguarded artifact while a schedule
operation may remain in flight is unsafe. A rollback needs the normal release
owner plus proven quiescence and provider/ledger recovery first. Never reverse
a successful provider tail solely because its Dataverse projection failed.

## Residual boundaries

The guard serializes JM1, not Stripe itself. Fresh provider reads before and
after the write remain mandatory. Existing external payment activity can still
change authority while a claim is held. No new refund webhook subscription is
commissioned by wrapping the existing refund handler. No automated stale-claim
release or generic finance administrator endpoint is added. The owner must
monitor held claims through durable evidence and existing exception handling.

References: [Dataverse create records](https://learn.microsoft.com/en-us/powerapps/developer/data-platform/webapi/create-entity-web-api)
and [Stripe idempotency](https://docs.stripe.com/api/idempotent_requests).
Durable state and provider readback, not a Stripe key alone, govern recovery
after the provider's idempotency retention period.
