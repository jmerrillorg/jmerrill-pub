# JM1 Publishing Capability Register Maintenance v1.0

Effective date: 2026-08-07

Authority: Jackie Smith, Jr., President & CEO.

## Purpose

Keep the Publishing Capability Register current without turning it into another standing burden for Jackie.

## Owner

Cody, scheduled — not Jackie.

## Cadence

Quarterly.

First run: early November 2026, after sprint JM1-SPRINT-90-001 closes September 6, 2026.

## Mode

Read-only re-inventory against the ruled baseline.

No production-system writes. No schema changes. No automation activation. No author-facing action.

## Output

Delta only. Do not produce a full re-inventory report unless Jackie separately requests it.

The delta package should include only:

- new capabilities since baseline;
- capabilities whose classification has drifted from their ruled disposition;
- capabilities whose Current Operational Owner changed;
- capabilities now unowned;
- changes in Operator Frequency;
- new conflicts.

## Jackie Obligation

Jackie rules the delta rows only.

No reruling of unchanged baseline rows is required.

## Consolidation Guard

Any future proposal to ABSORB or SUPERSEDE an existing capability requires explicit Jackie ruling.

Do not bulk-apply consolidation classifications during quarterly delta maintenance.

Factual metadata changes may be handled through normal delta maintenance.

This maintenance rule does not reopen already ruled capability classifications.

## Escalation

If a delta run returns more than 10 changed rows, flag it. More than 10 changed rows indicates the register is drifting faster than quarterly maintenance can hold, and the cadence needs revisiting.

## Boundary

This maintenance spec does not authorize implementation, remediation, Microsoft activation, Slice 3 runtime work, client-title automation thaw, or operating-model redesign.
