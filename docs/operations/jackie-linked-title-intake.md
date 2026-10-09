# Jackie linked-title intake

Status: draft implementation; no production commissioning claim.

The linked intake adapter preserves a title's production lifecycle and history.
It does not create a second publishing pipeline or reset a live stage.

## Bindings

The owning runtime supplies the existing stage-runtime container, a read-only
Dataverse client, an exact artifact-byte reader, and a governed continuing-scope
reader. It must not accept scope assertions from an HTTP caller or construct
scope merely from a title's display name.

`readScope(titleId)` returns the currently authorized internal scope's exact
title ID, mode, version, enabled state, revocation state, controlling-source
artifact ID and exact retained-artifact ID set. Revalidation on
every invocation and replay is automatic. It is not another human approval.
Changed business scope or editorial choices require their appropriate decision;
an unchanged authorized technical retry does not.

The original controlling source and retained approved work are separate exact
artifact bindings. For each, require title ID, active registration, current
approval, unsuperseded state, registry version, registered SHA-256 and independent
byte verification. Approval flags alone do not establish custody or permission
to reuse an artifact as the controlling manuscript for a later stage.

## Persistence and recovery

The existing `jm1-publishing-stage-runtime` container stores immutable plans
under `commissioning-plans/<titleId>/<bindingHash>.json` and intake assessment
receipts under `commissioning-intake/<titleId>/<bindingHash>.json`.

Both writes are create-only. Exact replay returns the original receipt. An
altered stored payload fails closed. If plan persistence succeeds but receipt
persistence fails, retry the same bound request; it reuses the existing plan
and completes the receipt. No author communication or historical effect is
replayed. Receipts contain metadata, not manuscript content.

`INTAKE_MATERIALS_VERIFIED` means source and retained material bindings passed.
It is not editorial completion, proof of all prior approvals, or permission to
advance a production stage. Pending requirements remain explicit in the receipt.

## Integration boundary

`executeTitleCommissioningIntake` is an adapter, not a scheduled runtime. It is
not yet registered in the deployed worker. Wire it through the existing owner
dispatch and durable wait/retry controls; do not introduce another scheduler.
The linked execution must never bypass current production-stage authority.

Prohibited effects: author communications, money movement, fulfillment, new
identifier registration, distribution submission, public release and live-stage
reset. Downstream adapters must enforce the same boundary independently.

## Acceptance

Require reviewed release and live SHA, exact source bytes, populated retained
work, durable plan and receipt readback, restart/replay with no duplicate effect,
source/revocation denial, and observed system-owned dispatch and recovery.
Fixture tests and local source readbacks alone cannot commission this path.
# Owner clarification and native runtime reader

The coordinator relayed Jackie's intended commissioning set: My AI Journey,
Til Death Do Us Part, The Intentional Leader, Establishing Glory: The Library,
and The Long Watch. Intentional Leader and Long Watch are the two year-long
works. Exact record/source versions remain independently verified bindings;
this clarification does not normalize Contacts or weaken the authorship guard.
Intentional Leader is actively being updated: preserved partial snapshots are
not final editions or evidence of lost content.

`createTitleCommissioningRuntimeReaders` reads owner-maintained scope from
`commissioning-scopes/<exact-title-id>.json` in the existing private container.
Each read uses the current ETag as an `ifMatch` condition, validates provenance,
and returns a version containing that ETag. No scope is written by intake and
no scope is accepted from an invocation approval flag. Missing scope or failed
read remains fail-closed. Scope provisioning, worker registration and deployed
acceptance are not established by this reader's source tests.

Artifact verification reuses the existing production SharePoint byte reader
and checks the registered SHA-256 without retaining manuscript text in receipts.
