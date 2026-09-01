# Canonical Universe Semantic Certification

Last Verified: 2026-09-01T08:58:42.419Z

## Counting Model

| Term | Certified meaning for Wave 1 | Count |
| --- | --- | --- |
| OPERATING_CENTER_RECORD_COUNT | One source Dataverse/title record in the accepted audit universe. | 408 |
| CANONICAL_AUTHORITY_CLASSIFIED_RECORD_COUNT | Source records assigned exactly one Wave 1 authority role in the crosswalk. | 408 |
| DISTINCT_SOURCE_TITLE_ID_COUNT | Distinct source TITLE_ID values in the frozen 408-record manifest. | 408 |
| DISTINCT_CANONICAL_TITLE_ID_COUNT | Not certified by Wave 1 because duplicate rows were not merged or bound to a single winning title ID. | NOT_CERTIFIED_BY_WAVE1 |
| CANONICAL_AUTHORITY_REFERENCE_COUNT | Source records populated with a canonical-title-reference value. This was previously mislabeled as CANONICAL_DISTINCT_TITLE_COUNT. | 408 |
| DISTINCT_CANONICAL_WORK_COUNT | ID-backed work/group proxy: 126 duplicate ID groups plus 74 non-duplicate source records. | 200 |
| DISTINCT_EDITION_COUNT | Distinct IDs in ISBN_EDITION_IDS from the audit graph. | 0 |
| DUPLICATE_RECORD_COUNT | Records classified DUPLICATE_RECORD in Wave 1 crosswalk. | 334 |
| LEGACY_RECORD_COUNT | Records classified LEGACY_TITLE_RECORD in Wave 1 crosswalk. | 45 |
| ACTIVE_PROJECT_COUNT | Distinct Opportunity IDs attached in the Wave 1 crosswalk. | 5 |
| PUBLISHED_TITLE_COUNT | Records classified CANONICAL_PUBLISHED_TITLE. | 20 |

## Critical Semantic Finding

`CANONICAL_DISTINCT_TITLE_COUNT = 408` was a mislabeled metric. It meant that all 408 source records had a canonical-title-reference value, not that Wave 1 proved 408 distinct canonical works or 408 authoritative current titles.

The corrected terminology is:

- `DISTINCT_SOURCE_TITLE_ID_COUNT = 408`
- `CANONICAL_AUTHORITY_REFERENCE_COUNT = 408`
- `DISTINCT_CANONICAL_TITLE_ID_COUNT = NOT_CERTIFIED_BY_WAVE1`
- `DISTINCT_CANONICAL_WORK_COUNT = 200`

## Duplicate Mathematics

| Measure | Count | Evidence |
| --- | --- | --- |
| UNIQUE_SOURCE_TITLE_IDS | 408 | 01_frozen_408_record_manifest.csv |
| UNIQUE_DUPLICATE_SOURCE_TITLE_IDS | 334 | 05_canonical_authority_crosswalk.csv |
| DUPLICATE_ID_GROUPS | 126 | 02_title_record_graph.csv:DUPLICATE_TITLE_RECORDS |
| MANY_TO_ONE_CANONICAL_GROUPS | 126 | 17_duplicate_reconciliation_mathematics.csv |
| SOURCE_RECORDS_IN_MANY_TO_ONE_GROUPS | 334 | 17_duplicate_reconciliation_mathematics.csv |
| SOURCE_RECORDS_COLLAPSING_TO_EXISTING_CANONICAL_TITLE | NOT_DETERMINED_BY_WAVE1 | Wave 1 did not choose merge winners or mutate duplicate relationships. |
| ONE_TO_ONE_CANONICAL_RECORDS | 74 | Non-DUPLICATE_RECORD rows in Wave 1 crosswalk. |

## Prior 198 Reconciliation

PRIOR_198_CLASSIFICATION = PRIOR_ESTIMATE_SUPERSEDED

The committed PR/issue search did not locate an authoritative method file containing the literal `ESTIMATED_CANONICAL_TITLE_UNIVERSE = 198`. The only direct current reference found was the Founder closeout instruction for this certification pass.

Wave 1 ID-backed grouping now yields 200 distinct canonical work/group proxies: 126 duplicate ID groups plus 74 non-duplicate source records. Because this calculation uses the accepted 408-row manifest and audit graph IDs, the prior 198 value is treated as a superseded estimate, not a current governed count.

## Six Nonlive Case Population

AMBIGUOUS_RECORDS = 6
FOUNDER_DECISION_RECORDS = 6
NONLIVE_SOURCE_RECORDS = 6
REQUIRES_RECONCILIATION_COUNT = 6
SAME_SIX_CASE_POPULATION = YES

The six records are the same population: each is classified `REQUIRES_RECONCILIATION`, requires Founder/operator decision, and had no live `jm1pub_title` write target during readback.

## Boundary

No Dataverse write was performed during this semantic certification. No runtime, projection, schema, workflow, lifecycle, Waiting On, timer, commercial, editorial, artifact, author-communication, or freeze state was changed.
