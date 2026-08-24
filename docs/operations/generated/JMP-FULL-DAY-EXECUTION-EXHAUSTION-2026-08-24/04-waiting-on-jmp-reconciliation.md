# Waiting On JMP Reconciliation

Last Verified: 2026-08-24T21:46:27.044Z

## Current Task Class Distribution

Scope: this table covers only the current `WAITING_ON_JMP` source population. The 2 current `AUTO_EXECUTABLE` rows are a separate execution population and are not counted inside the `WAITING_ON_JMP` denominator.

| Reconciliation field | Count |
| --- | ---: |
| WAITING_ON_JMP_SOURCE_COUNT | 250 |
| CLASSIFIED_UNIQUE_RECORD_COUNT | 250 |
| AUTO_EXECUTABLE_SEPARATE_POPULATION | 3 |
| DUPLICATE_CLASSIFICATIONS | 0 |
| UNCLASSIFIED_RECORDS | 0 |

| Exhaustion class | Count |
| --- | ---: |
| TERMINAL_OR_LEGACY_RECONCILIATION | 179 |
| DETERMINISTIC_DATA_REPAIR_OR_EVIDENCE_BINDING | 58 |
| RUNTIME_REPAIR_REQUIRED | 7 |
| TRUE_JMP_HUMAN_GATE | 5 |
| LEGACY_RECONCILIATION | 1 |

## Separate AUTO_EXECUTABLE Population

| Exhaustion class | Count |
| --- | ---: |
| RUNTIME_REPAIR_REQUIRED | 3 |

## System Attention Class Distribution

| System class | Count |
| --- | ---: |
| TERMINAL_STATE_CONFLICT | 179 |
| MISSING_AUTHOR_RELATIONSHIP | 31 |
| MISSING_ARTIFACT | 21 |
| RUNTIME_NOT_COMMISSIONED | 7 |
| MISSING_CANONICAL_LINK | 6 |
| LIFECYCLE_MAPPING_CONFLICT | 5 |
| LEGACY_RECONCILIATION | 1 |

## Waiting State Distribution

| Waiting state | Count |
| --- | ---: |
| WAITING_ON_JMP | 250 |
| TERMINAL | 164 |
| WAITING_ON_AUTHOR | 7 |
| AUTO_EXECUTABLE | 3 |
