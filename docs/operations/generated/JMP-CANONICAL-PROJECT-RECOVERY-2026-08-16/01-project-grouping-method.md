# Canonical Project Grouping Method

Last verified: 2026-08-17T01:22:36.151Z

Grouping order:

1. Canonical Project/Title ID when present.
2. Opportunity ID when a title ID is absent.
3. Active non-reconciliation intake ID when no stronger project key exists.
4. Normalized title plus author only as a fallback.

This pass does not delete, merge, or mutate Dataverse records. Raw records remain lineage/evidence; Jackie-facing operating queues use one canonical project row.
