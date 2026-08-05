# Migration and Backfill Plan

Status: DESIGN ONLY
Client-title automation: FROZEN

## Procedure

1. Inventory current title, edition, catalog, artifact, agreement, release and distribution evidence sources.
2. Perform current-state readback without mutation.
3. Detect duplicate active edition/PF records, duplicate identifiers, contradictory catalog links and missing title anchors.
4. Apply state inference only when authoritative evidence exists.
5. Leave records UNKNOWN or ON_HOLD when evidence is absent, disputed, stale, or contradictory.
6. Route records above manual thresholds to human review.
7. Sequence backfill title by title, using internal titles first for migration rehearsal.
8. Initialize execution-log evidence with source authority and idempotency keys.
9. Link Editorial Master versions and source/output artifacts only after artifact authority is resolved.
10. Create or extend PF records only after schema implementation authority is granted.
11. Retire obsolete fields by read-only deprecation plan; never delete operational history.
12. Roll back through managed solution rollback and compensating log evidence only.

## Inference Rules

| Evidence condition | Allowed inference | Fail-closed result |
| --- | --- | --- |
| Signed contract/package/SOW exists and catalog authority matches | PF may be CONTRACTED | If missing or contradictory, remain REQUESTED or ON_HOLD. |
| Editorial Master version and readiness checklist exist | PF may be READY_FOR_PRODUCTION | If source version missing, remain CONTRACTED/ON_HOLD. |
| Output artifact and production start evidence exist | PF may be IN_PRODUCTION or INTERNAL_QA depending QA evidence | If artifact authority unresolved, require manual review. |
| Author package and decision exist | PF may be AUTHOR_REVIEW or APPROVED | If author decision ambiguous, remain AUTHOR_REVIEW/ON_HOLD. |
| Submission receipt exists | PF may be SUBMITTED | If no receipt, remain DISTRIBUTION_READY. |
| Confirmed-live readback exists | PF may be LIVE | If only expected release date exists, do not infer live. |
| Retirement/cancellation authority exists | PF may be RETIRED or CANCELLED | If historical status unclear, manual review. |

No client title may be auto-classified into a state without authoritative evidence.
