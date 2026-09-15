# JMP Pipeline 004 Historical Duplicate Reference Suppression

Date: 2026-09-15
Generated at: 2026-09-15T18:43:24Z
Repository: jmerrill-pub
Branch: codex/jmp-pipeline-004-historical-normalization
Baseline: origin/main @ 5a2439183d390881886ca26b4b5deacbbb332b13
Work package: JMP-PIPELINE-004
Execution model: clean-worktree read-model normalization

## Scope

JMP-PIPELINE-004 suppresses/archive-normalizes noncurrent historical duplicate references that were classified in JMP-PIPELINE-003 as deterministic duplicate historical records.

This work does not:

- advance lifecycle state
- change title/author/commercial/provider state
- create lifecycle events
- send author communications
- delete historical evidence
- alter the 2026 Royalty Decision Package

## Starting Authority

Source packet: docs/operations/generated/JMP-PIPELINE-003-RECONCILIATION-QUEUE-TRIAGE-2026-09-15.md

PIPELINE_003_QUEUE_ITEMS = 19
PIPELINE_003_TRUE_DATA_DEFECT = 18
PIPELINE_003_HUMAN_BUSINESS_DECISION_REQUIRED = 1
PIPELINE_003_ROYALTY_DECISION_ITEM = title:2026-royalty-backlog

The 18 TRUE_DATA_DEFECT rows are all classified as:

- AmbiguityReason: DUPLICATE_HISTORICAL_RECORD_REFERENCE
- ResolutionClass: TRUE_DATA_DEFECT
- ProposedRepair: Suppress/archive noncurrent duplicate reference; do not create lifecycle event
- SafeToAutomate: YES_READ_MODEL_SUPPRESSION_ONLY

## Historical Reference Inventory

| WorkId | Title | Author | ReferenceId | Classification | SafeDisposition | HistoricalEvidencePreserved |
| --- | --- | --- | --- | --- | --- | --- |
| fad1c5d7-b389-f111-ab10-000d3a9eacee | 100 Wisdom Lessons for Life and Living | J Derrick Johnson | W1-309 | DUPLICATE_READ_MODEL_REFERENCE | READ_MODEL_SUPPRESSION | YES |
| d8e69bd7-b389-f111-ab10-6045bdd69435 | 27 Days to Overcoming Depression | Donjia Walls | W1-189 | DUPLICATE_READ_MODEL_REFERENCE | READ_MODEL_SUPPRESSION | YES |
| dee69bd7-b389-f111-ab10-6045bdd69435 | 365 Days Of Transparency | Daphanny Baker | W1-190 | DUPLICATE_READ_MODEL_REFERENCE | READ_MODEL_SUPPRESSION | YES |
| 8e0402da-b389-f111-ab10-000d3a14673b | 7 Step Jumpstart to Becoming Your Best Self | Ericka Johnson Settles | W1-052 | DUPLICATE_READ_MODEL_REFERENCE | READ_MODEL_SUPPRESSION | YES |
| 4b9a11da-b389-f111-ab10-6045bdd69738 | A Blended Family | Shecara Norris | W1-191 | DUPLICATE_READ_MODEL_REFERENCE | READ_MODEL_SUPPRESSION | YES |
| 9fe382d8-b389-f111-ab10-6045bdd69678 | A Little Bit of Everything | Eryonna Barrino | W1-193 | DUPLICATE_READ_MODEL_REFERENCE | READ_MODEL_SUPPRESSION | YES |
| a8e382d8-b389-f111-ab10-6045bdd69678 | A Portrait of Paradise | Iyorwuese Hagher | W1-055 | DUPLICATE_READ_MODEL_REFERENCE | READ_MODEL_SUPPRESSION | YES |
| abe382d8-b389-f111-ab10-6045bdd69678 | A Principal's Tale | Shelley McIntosh | W1-195 | DUPLICATE_READ_MODEL_REFERENCE | READ_MODEL_SUPPRESSION | YES |
| 11d2c5d7-b389-f111-ab10-000d3a9eacee | A Truebies Guide, Part 1 | Alesia Corpening | W1-057 | DUPLICATE_READ_MODEL_REFERENCE | READ_MODEL_SUPPRESSION | YES |
| 2554a0dd-b389-f111-ab10-6045bdd69435 | A Truebies Guide, Part 2 | Alesia Corpening | W1-060 | DUPLICATE_READ_MODEL_REFERENCE | READ_MODEL_SUPPRESSION | YES |
| f67d1ada-b389-f111-ab10-7c1e525b15c2 | Abortion! | Carolyn Booker-Pierce | W1-063 | DUPLICATE_READ_MODEL_REFERENCE | READ_MODEL_SUPPRESSION | YES |
| 509a11da-b389-f111-ab10-6045bdd69738 | According to Mark | Alice Pryor | W1-196 | DUPLICATE_READ_MODEL_REFERENCE | READ_MODEL_SUPPRESSION | YES |
| 8c3582da-b389-f111-ab10-00224820105b | Aligned! | Dennis Brown | W1-065 | DUPLICATE_READ_MODEL_REFERENCE | READ_MODEL_SUPPRESSION | YES |
| a00402da-b389-f111-ab10-000d3a14673b | Almost Happy | Jaylonna Stevette | W1-066 | DUPLICATE_READ_MODEL_REFERENCE | READ_MODEL_SUPPRESSION | YES |
| 549a11da-b389-f111-ab10-6045bdd69738 | Are You Sure That You Are Ready? | Ericka Thornton | W1-199 | DUPLICATE_READ_MODEL_REFERENCE | READ_MODEL_SUPPRESSION | YES |
| 017e1ada-b389-f111-ab10-7c1e525b15c2 | Because the Lord is My Shepherd | Carolyn Booker-Pierce | W1-068 | DUPLICATE_READ_MODEL_REFERENCE | READ_MODEL_SUPPRESSION | YES |
| a60402da-b389-f111-ab10-000d3a14673b | BEE Careful | Deborah Eiland | W1-200 | DUPLICATE_READ_MODEL_REFERENCE | READ_MODEL_SUPPRESSION | YES |
| 569a11da-b389-f111-ab10-6045bdd69738 | Biblical Prescriptions For Life's Troubles | Terry Stephens | W1-205 | DUPLICATE_READ_MODEL_REFERENCE | READ_MODEL_SUPPRESSION | YES |

ROWS_INVENTORIED = 18
ROWS_WITH_NON_UNKNOWN_CLASSIFICATION = 18
READ_MODEL_SUPPRESSIONS = 18
ARCHIVE_CLASSIFICATIONS = 18
SUPERSESSION_LINKS = 0
ALIAS_MAPPINGS = 0
LEGACY_MARKERS = 0
HISTORICAL_EVIDENCE_LOSS = 0

## Implemented Read Model Behavior

The Publisher Pipeline now keeps the historical duplicate references out of current reconciliation work only when all of the following remain true:

- WorkId is present in the noncurrent historical reference registry
- Confidence is RECONCILIATION_REQUIRED
- ResolutionClass is TRUE_DATA_DEFECT
- AmbiguityReason is DUPLICATE_HISTORICAL_RECORD_REFERENCE
- SafeToAutomate is YES_READ_MODEL_SUPPRESSION_ONLY

If any predicate fails, the row is not suppressed.

The suppressed rows remain operator-visible in a separate archived/historical section, and the summary exposes the suppressed count.

## Protected Items

ROYALTY_DECISION_PACKAGE_PRESENT = YES
ROYALTY_DECISION_PACKAGE_SUPPRESSED = NO
ROYALTY_DECISION_PACKAGE_UNCHANGED = YES

ACTIVE_TITLE_COLLISIONS = 0
WHOLE_MUTATED = NO
BEFORE_YOU_WERE_BORN_MUTATED = NO
INDOMITABLE_MUTATED = NO
ESTABLISHING_GLORY_MUTATED = NO

## Verification

TYPE_CHECK = PASS
PUBLISHER_PIPELINE_16_STAGE_GUARD = PASS
WORKFLOW_ENGINE_GUARD = PASS
JMP_LIFECYCLE_WAVE_B_OPERATING_CENTER_GUARD = PASS
JMP_LIFECYCLE_WAVE_C_EVIDENCE_COMPLETION_GUARD = PASS
LINT = PASS_WITH_EXISTING_WARNING
BUILD = PASS_WITH_EXISTING_WARNINGS
DIFF_CHECK = PASS

Known nonblocking warnings:

- Existing lint warning in app/layout.tsx for custom font loading.
- Existing Node MODULE_TYPELESS_PACKAGE_JSON warning in Node test execution.
- Existing Next.js middleware/proxy migration warning.
- Existing Edge Runtime deprecation warning.
- Existing broad dynamic file-pattern build warnings in generated-doc read paths.

## Mutation Statement

AUTHOR_RECORD_MUTATIONS = 0
TITLE_LIFECYCLE_MUTATIONS = 0
COMMERCIAL_MUTATIONS = 0
PROVIDER_ACTIONS = 0
DISTRIBUTION_MUTATIONS = 0
AUTHOR_COMMUNICATIONS = 0
ROYALTY_DECISION_MUTATIONS = 0
PRODUCTION_DEPLOYMENTS = 0

## Return

JMP_PIPELINE_004_STATUS = LOCAL_IMPLEMENTATION_COMPLETE_PENDING_PR_AND_DEPLOYMENT
RECONCILIATION_ROWS_REMEDIATED = 18
RECONCILIATION_ROWS_ARCHIVED = 18
RECONCILIATION_ROWS_REMAINING_CURRENT = 1
ROYALTY_DECISION_PACKAGE_VISIBLE = YES
HISTORICAL_EVIDENCE_PRESERVED = YES
READ_MODEL_SUPPRESSION_ONLY = YES
RUNTIME_CODE_CHANGED = YES
PR_REQUIRED = YES
PRODUCTION_DEPLOYMENT_REQUIRED = YES_AFTER_MERGE
NEXT_GATE = PR_REVIEW_MERGE_DEPLOYMENT_PRODUCTION_READBACK
