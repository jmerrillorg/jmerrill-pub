# Invalid Blocker Policy

Generated: 2026-08-01

## Implemented Rules

The following rules were added to `lib/server/executive-recovery-policy.ts`:

- OWNER_AUTHORED_TITLE
- INTERNAL_VERIFICATION_TITLE
- APPROVED_DISCLAIMER_PRESENT
- EXECUTIVE_RECOVERY

## Rule Effects

OWNER_AUTHORED_TITLE:

When a title is owner-authored and the canonical Contact/email are known, recipient discovery cannot continue blocking package completion.

INTERNAL_VERIFICATION_TITLE:

When an owner-authored title is being processed for internal verification, an owner-to-company contract prerequisite cannot block the pipeline.

APPROVED_DISCLAIMER_PRESENT:

When an approved disclaimer is present and no separate documented legal restriction exists, the resolved disclaimer issue cannot remain as an active legal blocker.

EXECUTIVE_RECOVERY:

When Executive Recovery is authorized, obsolete internal cadence holds are superseded. This does not override legal, contractual, recipient-conflict, missing manuscript, or protected-credential blockers.

## Validation

Test:

`node scripts/executive_recovery_policy.test.mjs`

Result:

PASS - 4/4

## Boundary

These rules do not waive contracts for independent external authors and do not permit fabricated manuscripts, fabricated author content, false approvals, duplicate Contacts, duplicate title relationships, duplicate gates, or duplicate communications.
