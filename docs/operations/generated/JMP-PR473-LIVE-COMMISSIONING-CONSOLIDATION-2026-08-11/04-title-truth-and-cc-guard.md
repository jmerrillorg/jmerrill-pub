# Title Truth and CC Guard

Last verified: 2026-08-12T01:36:21Z

## Title Truth

The 196 `reconciliation_required` records remain a distinct next boundary.

PR #473 read-model corrections are intended to prevent ambiguous historical/backlist/test/certification records from falsely inflating:

- active editorial;
- production queue;
- Waiting on Author;
- Needs Jackie;
- Blocked.

No broad data cleanup was attempted in this PR.

## Author-Facing CC Guard

The global author-facing CC canon is implemented and regression-guarded:

- all governed author-facing email paths must CC `publishing@jmerrill.one`;
- internal-only notifications remain separate;
- historical live sends with missing shared-mailbox CC were documented and not resent.

No legitimate post-remediation author-facing email occurred during this consolidation pass, so the live classification remains:

IMPLEMENTED / REGRESSION-GUARDED / FIRST POST-REMEDIATION LIVE SEND PENDING.

