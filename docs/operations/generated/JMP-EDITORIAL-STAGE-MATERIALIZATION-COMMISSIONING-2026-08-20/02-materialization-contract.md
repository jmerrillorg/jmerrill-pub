# Materialization Contract

## Contract

The service materializes a next editorial stage only when all of the following are true:

- The completed current stage is actually complete.
- The approval gate is final approval, not conditional approval.
- The approval gate is bound to the exact deliverable artifact.
- The deliverable artifact checksum matches the expected checksum.
- The requested target stage matches the canonical next stage.
- `nextStageAuthorized` is true.
- The title lineage is unambiguous.
- No duplicate active target-stage row exists.

## Current Bounded Mapping

Developmental Editing -> Line Editing.

## Idempotency

Same title + same completed stage + same approved artifact + same target stage reuses the existing target stage and creates no duplicate.

## Communication Boundary

Stage materialization sends no author communication.

