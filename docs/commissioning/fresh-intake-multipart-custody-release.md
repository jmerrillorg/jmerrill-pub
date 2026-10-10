# Fresh intake: multipart custody and minimal access

This is source/release preparation, not commissioned production or financial,
editorial, publication, or deployment approval. Accepted PR #967 custody proofs
remain accepted. Historical stage outputs satisfy no fresh stage outcome.

## Existing runtime integration

- The same fresh intake adapter and lease/CAS/retry worker now bind the two
  exact Intentional Leader originals independently. Both components are pinned
  by item ID, ETag, length, path and SHA-256. No concatenation occurs.
- The fresh run hash covers the complete source collection. Replay must retain
  both components unchanged; intake completion explicitly reports
  `SOURCE_COMPONENT_ORDER_AUTHORITY_REQUIRED` for downstream editorial work.
- Long Watch custody preparation uses the existing keyed source-registration
  route and the existing commissioning step worker. It verifies original
  artifact e8b7ff2b-1c84-f111-ab0f-6045bdd69678, source item
  01DF3SEQKUFRHMX73I7FCJPUP3PICXOTHB, ETag38, exact bytes and parent custody.
- It creates only an `_ORIGINAL` child and a create-only original-byte copy,
  never moves or overwrites the historical source. Durable intent and receipt
  bind source and destination. Lost responses reconcile the exact target.
- Fresh Long Watch intake requires that receipt and independently reads both
  the historical source and copied original. A receipt alone is insufficient.
- All custody mutations require
  `JM1_TITLE_COMMISSIONING_ORIGINAL_CUSTODY_ENABLED=true`. Default is disabled.
  Review, broad stage, and wait workers must remain explicitly false.
- No new scheduler, intake queue, author communication or model call is added.

## Platform least privilege

The existing application user cb6e97e5-1d6a-f111-a826-000d3a9eacee resides in
root HQ, not a Publishing-only business unit. The earlier Local Read proposal
is superseded; do not grant it from this document.

Proposed minimal runtime rights, requiring platform-owner validation:

| Table | Operations | Scope |
| --- | --- | --- |
| PublishingEngagement | Read, Create | Basic, runtime-owned records |
| LifecycleInstance | Read, Create | Basic, runtime-owned records |
| StageInstance | Read, Create | Basic, runtime-owned records |
| StageDefinition | Read | Basic plus supported read-only sharing of the exact 16 existing rows |

No Write, Delete, Assign, Share privilege, financial permission, new identity,
or shared-role removal is required by this intake proposal. Sharing the 16
definitions is a platform-owner operation, not a runtime Share privilege.
Its effective positive and negative scope must be proved before enablement.
Metadata-read access to EntityDefinitions/Keys must also be verified using
the actual runtime identity, not an administrator readback.

## Cross-owner uniqueness and recovery

October 10 metadata proves an Active PublishingEngagement alternate key on
`jmpv2_canonicaltitleid`. LifecycleInstance and StageInstance have no alternate
keys. Their exact deterministic primary IDs provide per-run replay identity,
not a global title uniqueness guarantee.

The adapter now verifies the active exact-title key on every execution and
preflight. A security-trimmed query is explicitly not global absence proof.
Engagement creation reserves that title key before original-byte storage or
lifecycle/stage writes. An unreadable competing owner is rejected by the
provider key and remains held; it is not copied, overwritten or excluded.
Every transactional readback also requires the expected application owner ID.

A partial successful reservation remains visible as incomplete intake, not
stage completion. Recovery reuses the same deterministic IDs and exact
payload; it never creates an alternative engagement. Stage events and final
completion are emitted only after all required records and bytes read back.

## Acceptance and release serialization

1. Review this exact successor head and mandatory CI; do not infer approval
   from focused tests. Keep all fresh and custody flags disabled.
2. OPS validates the reduced Basic rights, exact definition shares, active
   title uniqueness and negative scope. Do not remove unrelated shared roles.
3. Serialize any protected successor deployment with the platform-owner
   preflight. Match the reviewed merge artifact, release SHA and health.
4. Run current-SHA native read-only preflight. Verify effective record ownership,
   metadata/key visibility and definition reads; never substitute admin identity.
5. Only then enable the bounded, approved title allowlist (maximum two).
   Multipart intake completes no editorial-order decision.
6. Long Watch copy enablement is separate and bounded to its exact source,
   target and crosswalk. Verify unchanged historical bytes, copied bytes,
   immutable provenance receipt and restart replay before fresh intake.
7. Prove native canonical ownership, journal outcomes and replay without
   duplicates. Keep paid/editorial/provider stages held until actual authority.

Rollback: disable fresh and custody flags first, preserve intents, copies and
partial reservations, then deploy the prior reviewed artifact if necessary.
Never delete an uncertain copy or restore historical outputs as fresh proof.

Focused fixtures exercise collection binding, successful/ambiguous upload,
restart, changed-source rejection, hidden-owner conflict, inactive/mismatched
keys and owner mismatch. These are synthetic proof, not live stage acceptance.
