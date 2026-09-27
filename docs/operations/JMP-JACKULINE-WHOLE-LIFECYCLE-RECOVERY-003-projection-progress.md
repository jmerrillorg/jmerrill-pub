# Whole Lifecycle Recovery - Projection Read Repair

Packet: JMP-JACKULINE-WHOLE-LIFECYCLE-RECOVERY-003
Status: IN_PROGRESS; not a lifecycle or author-decision closure certificate.

## Proven Read-Model Defect

The canonical Whole title has a directly title-bound Developmental stage
ae3c9d5e-67b5-f111-aaab-000d3a10aa9c, created 2026-09-21T02:51:41Z.
Its publishing-asset lookup is null. The older Review stage belongs to asset
7272744e-85a3-f111-b8de-6045bdd69678. The portal previously read stages only
through the publishing asset, hiding the directly title-bound current stage.

The shared read helper now reads active records under the immutable title ID
first, verifies the returned title binding, and uses legacy asset fallback only
when the asset's own title binding matches. Both portal project paths use it.
It does not create a stage, infer delivery, infer approval, or move a workspace.
Latest record ordering determines display within the exact governed relationship;
it is not used to discover an author/title relationship by text or proximity.

## Production Readback Registration Correction

PR 881 deployed canonical rendering source successfully. Its first native mailbox
readback attempt returned HTTP 404 because the new module was not included in the
Function startup entry point. The read-only module is now explicitly registered,
with a startup test and an unauthorized live-route deployment probe. The probe
must return 401; a missing 404 route fails deployment validation.

## Boundaries and Open Work

Founder-proven Developmental delivery remains valid. No author approval is
fabricated. A fresh complete mailbox read is still required before concluding
that no editorial response exists or authorizing a response-dependent route.
Previously sent checksums must not be confused with later regenerated outputs.

Onboarding answer reconstruction remains separate from delivered editorial
progress. No whole-form retry, OTP resend, formatting-only resend, lifecycle
transition, payment mutation, or manual business response is initiated by this
read-model repair. Phase 7 remains held. Issue 880 remains open.
