# Jackie Ruling Session Guide

## Purpose

Prepare Jackie to rule on catalog reconciliation without changing catalog, pricing, Dataverse, or Business Central state.

## Current Inputs

- Canon-candidate DOCX parse: PASS, 112 unique SKUs.
- Original worksheet: 104 rows.
- Missing SKU delta from original worksheet: 16 rows.
- Worksheet grouped by ruling class: Class A 93, Class B 6, Class C 2, Class D 3.
- Jackie ruling column: BLANK.

## Ruling Classes

| Class | Meaning | Count |
|---|---|---:|
| Class A | MIGRATE-AS-IS | 93 |
| Class B | SUPERSEDED | 6 |
| Class C | MIGRATE-AMENDED | 2 |
| Class D | PROVISIONAL | 3 |

## Recommended Session Order

1. Review the 16-row missing SKU delta against the amended worksheet.
2. Spot-check the 10 Class A rows across SKU families.
3. Rule on Class B supersession candidates.
4. Rule on Class C amendment candidates.
5. Rule on Class D provisional candidates and any added v2.1 delta rows.
6. Preserve unresolved items as decision-required rather than migrating by inference.

## Prohibited During Ruling Session

- No migration.
- No deployment.
- No repricing.
- No retirement.
- No Business Central item creation.
- No Dataverse mutation.
- No catalog mutation.
