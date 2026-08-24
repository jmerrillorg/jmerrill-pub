# Backlog Baseline

Last Verified: 2026-08-24T20:31:48Z

Source package:

`docs/operations/generated/JMP-FULL-DAY-EXECUTION-EXHAUSTION-2026-08-24/05-structured-task-audit.csv`

## Population

| Population | Count |
| --- | ---: |
| Source rows | 254 |
| WAITING_ON_JMP rows | 252 |
| AUTO_EXECUTABLE separate population | 2 |
| Classified unique waiting rows | 252 |
| Duplicate classifications | 0 |
| Unclassified records | 0 |

## Exhaustion Class Distribution

| Class | Count |
| --- | ---: |
| TERMINAL_OR_LEGACY_RECONCILIATION | 179 |
| DETERMINISTIC_DATA_REPAIR_OR_EVIDENCE_BINDING | 60 |
| RUNTIME_REPAIR_REQUIRED | 9 |
| TRUE_JMP_HUMAN_GATE | 5 |
| LEGACY_RECONCILIATION | 1 |

## System Attention Class Distribution

| Class | Count |
| --- | ---: |
| TERMINAL_STATE_CONFLICT | 179 |
| MISSING_AUTHOR_RELATIONSHIP | 31 |
| MISSING_ARTIFACT | 21 |
| RUNTIME_NOT_COMMISSIONED | 8 |
| MISSING_CANONICAL_LINK | 7 |
| LIFECYCLE_MAPPING_CONFLICT | 5 |
| PRODUCTION_DEPENDENCY_MISSING | 2 |
| LEGACY_RECONCILIATION | 1 |

## Current Wave Disposition

This PR repairs one systemic runtime/payment-agreement detection defect found during the exhaustion wave. The remaining terminal/legacy and deterministic binding rows are not reclassified by this code patch and must remain visible until separately reconciled by evidence or runtime execution.

