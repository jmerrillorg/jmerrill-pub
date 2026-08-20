# Materialization Root Cause

## Finding

Root cause class: `APPROVAL_EVENT_NOT_MATERIALIZING_NEXT_STAGE`.

PR #526 correctly added targeted editorial execution control, but the real approved titles did not have canonical Line stage rows. The targeted executor properly refused to invent stages, so The General's Will and The Long Watch remained blocked until a governed stage materializer existed.

## Inspected Areas

- Approval event consumer.
- Author review response consumer.
- Editorial execution runtime.
- Existing stage/materialization patterns.
- Dataverse stage and artifact records.

## Correction

PR #527 introduced deterministic next-stage materialization:

completed Developmental stage + full author approval + exact approved artifact + checksum match + `nextStageAuthorized=true` -> exactly one Line stage row.

No manual Line row was created.

