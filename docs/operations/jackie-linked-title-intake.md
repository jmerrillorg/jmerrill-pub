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

Received originals, approved controlling sources and retained review work are
separate exact artifact roles. Every role requires title ID, active registration,
registry version, registered SHA-256 and independent byte verification.
Approved controlling sources additionally require current approval and an
unsuperseded state. Retained unapproved work does not acquire approval by reuse.
Received originals require exact intake/immutable-manifest authority or the
founder-scoped Vellum work UUID; they cannot dispatch an editorial model call.
Approval flags alone do not establish custody or later-stage authority.

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

`executeTitleCommissioningIntake` is an adapter. The draft runtime binds it to
the existing `reconcile-publishing-waits` five-minute timer; it is not yet deployed.
No additional scheduler or stage queue consumer is introduced.
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

## Bounded intake worker (draft, disabled by default)

`JM1_TITLE_COMMISSIONING_INTAKE_ENABLED=true` and an exact, lowercase GUID
allowlist in `JM1_TITLE_COMMISSIONING_INTAKE_TITLE_IDS` are both required.
The list is bounded to five distinct title IDs. This setting does not enable
the author-response queue or broad stage worker.

The timer reads only `commissioning-requests/<title-id>.json`, using its ETag.
Requests require schema version 1 and an authority reference identical to the
separately read owner scope. Scope/request provisioning remains a governed
technical release task; existence of a blob is not approval of a manuscript.

Execution records at `commissioning-executions/<title-id>/<binding-hash>.json`
use create-only or ETag compare-and-swap claims. The claim lasts five minutes;
an expired claim resumes the same idempotent intake adapter. Transient provider
errors retry with exponential backoff for at most five attempts. Authority or
result failures become HELD, not automatically retried. Failure receipts and
timer telemetry contain only title/execution references and fixed safe codes.
Live alert delivery is still an acceptance requirement, not a source-test claim.

Completion points to the immutable intake receipt and does not complete or
advance any canonical stage. Replay returns the existing execution result.
If ownership changes while work is running, the stale claimant cannot overwrite
the new result. Disablement stops new timer dispatch; it does not delete claims,
receipts, source history, or current title state.

## Exact owner provisioning and readback

The reviewed `titleCommissioningOwnerBindings` module pins Establishing Glory's
original artifact, four retained artifact IDs, versions and registered hashes.
An enabled allowlisted timer can provision only these scope/request records,
after fresh native title, artifact and byte checks. It uses create-only writes;
any existing conflicting or revoked scope wins. A partial write recovers forward
without replacing the preserved scope. No operator storage key is substituted.
The additional bindings below are release candidates, not live acceptance proof.

## Received-source registration and identity reconciliation

The authenticated `publishing/commissioning/source-registration` route accepts
only compiled exact title IDs and a fixed mode. `PREFLIGHT` is read-only.
`REGISTER_INTAKE` requires both `JM1_TITLE_COMMISSIONING_REGISTRATION_ENABLED=true`
and the exact bounded `JM1_TITLE_COMMISSIONING_REGISTRATION_TITLE_IDS` list.
Ordinary editorial inference must remain disabled. Registration uses the existing
private stage-runtime container, create-only intent and result records, and a
renewed exclusive blob lease. Conflicting or revoked scope is never overwritten.

Til Death registration preserves the real title and binds its original source
to its existing intake and immutable manifest. My AI Journey proposes an
explicit new internal title tied to its fixed Vellum book UUID, never an inferred
existing ID. Any existing work-reference, name or source-item candidate prevents
creation until its crosswalk is resolved. Original/alias bytes must agree.
Native source metadata must establish exact ID, size, ETag, Publishing host/drive
and current Pipeline A-Z location. Registry location records the SharePoint URL,
not a Graph transport URL. Registrations remain explicitly unapproved.

The Long Watch `IDENTITY_PREFLIGHT` mode checks the exact historical execution
log, intake, retained asset and approved original, plus the current title
preimage. `RECONCILE_IDENTITY` additionally requires
`JM1_TITLE_COMMISSIONING_LONGWATCH_RECONCILIATION_ENABLED=true` and inference off.
It changes only the proven canonical Contact reference with an If-Match write,
preserves the full business preimage and independently verifies all other fields.
It does not merge Contacts, approve edited material or advance a stage.

Before release, require full tests and current-head review. After protected
deployment, require exact release SHA, native read-only preflight, bounded
registration/correction, independent registry and intake readback, and exact-ID
replay without duplicate effects. Remove temporary registration/reconciliation
settings afterward. Broad stage/wait workers remain disabled. Any ambiguous
write requires same-ID readback and forward recovery, not a new ID or reset.
No linked source registration commissions the complete Publishing pipeline.

## Prospective Glory assessment decision

The authenticated Glory recovery route accepts only
`{"mode":"PREPARE_NEXT_ASSESSMENT"}` to prepare a read-only proposal from the
exact held attempt-six preimage. Review, stage and wait dispatch must be off.
The proposal binds current source/canon bytes, deployment, request hash,
existing private tariff and a fresh provider token count. Counting is not
inference; this mode writes no authority, claim or receipt and calls no model.

The consumed attempt-six approval is not a new grant. The result remains
`DECISION_REQUIRED_NOT_EXECUTABLE`; its planning ceiling is not spend approval.
A new attributable decision and separately reviewed held-six-to-seven adapter
are required before any additional inference. No scheduled retry is authorized.

The original local draft plan is preserved. The governed runtime plan replaces
its local inventory-file history reference with an exact Dataverse title history
reference, so its binding hash differs from that never-executed local proposal.
This is not a replay or a reset of production title history.

The existing authenticated lifecycle readback route accepts only
`{"mode":"COMMISSIONING_INTAKE_READ_ONLY","titleId":"f1908dc9-5775-f111-ab0f-6045bdd69435"}`
for this acceptance. It freshly checks native bytes and returns ETag-bound
execution/receipt metadata without writes. Additional fields or other titles
are denied. It can prove native read access before timer enablement; a proposed
unpersisted scope is explicitly distinguished from a persisted one.

`infra/jm1-infra-006/app-service/title-commissioning-intake-alert.bicep` defines a
stateful failure/resolution rule against this timer's latest metadata-only
observation and the existing Publishing operations action group. It neither
changes recipients nor introduces a scheduler or agent. Actual failure and
resolution email delivery remain live acceptance items after protected release.

## Controlled live recovery exercise

Only the fixed compiled Establishing Glory request permits an acceptance fault.
Set a unique UUID in `JM1_TITLE_COMMISSIONING_ACCEPTANCE_ID` and one of
`RECEIPT_WRITE_TRANSIENT` or `AFTER_CLAIM_PAUSE` in
`JM1_TITLE_COMMISSIONING_ACCEPTANCE_FAULT`. Unknown modes, titles and IDs fail
closed. The default is no fault. The reviewed mechanism records a create-only
exercise reference; it cannot send, generate a manuscript, advance a stage or
modify the source bytes.

The receipt fault permits plan persistence but fails before the intake receipt
write. Observe the same execution's retry state and actual alert. Remove the
fault to restore the receipt dependency. For the restart exercise, the next
claim pauses six minutes before intake; restart the host and remove the control,
then observe natural expired-claim recovery with the same execution identity.
Do not count an injected fault as a spontaneous provider outage. Capture the
original production settings first; keep wait and broad stage dispatch disabled.
After the receipt completes, prove exact replay and remove both temporary
acceptance settings. Retain all exercise and execution records.
