# JMP Pipeline 003 Reconciliation Queue Triage

Date: 2026-09-15
Repository: jmerrill-pub
Branch: codex/jmp-pipeline-003-reconciliation
Work package: JMP-PIPELINE-003
Execution model: clean-worktree classification and safe remediation prep

## Source State

PR739_STATUS = MERGED
PR739_HEAD = 623c76bb9e3911c0163c310f9e2164471b4ab2af
PR739_MERGE_SHA = fa14d3d78b4baf1d79429132eb337dab183f3a3b
POST_MERGE_MAIN = fa14d3d78b4baf1d79429132eb337dab183f3a3b

CANONICAL_MAIN = fa14d3d78b4baf1d79429132eb337dab183f3a3b
DEPLOYED_RUNTIME_SHA = 483061b104d474b68bbfb6692120b72d2e790d56

The canonical source SHA and deployed runtime SHA differ by an evidence-only merge. This is expected and not a defect. No production deployment is required solely to force SHA equality.

## Runtime Readback

Readback source: Dataverse-backed Publisher Operating Center snapshot and the same human Pipeline read model used by `/publisher/pipeline`.

LOCAL_BROWSER_API_READBACK = NOT_AVAILABLE
LOCAL_BROWSER_API_READBACK_REASON = No local dev server was listening on port 3001 during this run.
SERVER_READ_MODEL_EXECUTION = PASS_WITH_READ_ONLY_DATAVERSE_ADAPTER
DATAVERSE_WRITES = 0

Snapshot generated at: 2026-09-15T17:48:19.564Z

TOTAL_TITLES = 31
PLACED_TITLES = 12
RECONCILIATION_QUEUE = 19
AMBIGUOUS_TITLES = 19
DUPLICATE_PROJECTIONS = 0
SILENT_AMBIGUOUS_PLACEMENT = 0

## Classification Summary

QUEUE_ITEMS_CAPTURED = 19
UNCLASSIFIED_QUEUE_ITEMS = 0
UNKNOWN_AMBIGUITY_REASON = 0
WORK_FORMAT_COLLAPSE_ERRORS = 0
SILENT_AMBIGUOUS_PLACEMENTS = 0

DETERMINISTIC_REPAIR = 0
GOVERNED_EVENT_BACKFILL_REQUIRED = 0
HUMAN_BUSINESS_DECISION_REQUIRED = 1
EXTERNAL_DEPENDENCY = 0
TRUE_DATA_DEFECT = 18

The queue is not ready to close to zero. It is ready for governed remediation because all 19 queue items now have an explained reason, evidence authority, resolution class, and automation safety classification.

## Reconciliation Matrix

| WorkId | Title | Author | V1Origin | CurrentProjection | CandidateStage | AmbiguityReason | EvidenceAuthority | ResolvableFromExistingEvidence | ResolutionClass | ProposedRepair | HumanDecisionRequired | ExternalDependency | SafeToAutomate | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| title:2026-royalty-backlog | 2026 Royalty Decision Package | Multiple authors | YES | DATA_GAP | unresolved | MISSING_CANONICAL_STAGE_EVENT / GOVERNED_HOLD | `/docs/operations/generated/2026-07-19-JM1-Royalty-Operations-Wave2-Decision-Packages.csv`; blocker: 37 identity holds, 44 title holds, 11 unresolved payments | NO | HUMAN_BUSINESS_DECISION_REQUIRED | Prepare founder decision packet for identity holds, title holds, and unresolved payment allocation before statements are approved | YES | NO | NO | Classified / remains in reconciliation |
| fad1c5d7-b389-f111-ab10-000d3a9eacee | 100 Wisdom Lessons for Life and Living | J Derrick Johnson | YES | DATA_GAP | unresolved | DUPLICATE_HISTORICAL_RECORD_REFERENCE | PUBLISHING_OPERATING_CENTER_WAVE1_2026_09_01:W1-309; canonical authority classification DUPLICATE_RECORD | YES | TRUE_DATA_DEFECT | Suppress/archive noncurrent duplicate reference; do not create lifecycle event | NO | NO | YES_READ_MODEL_SUPPRESSION_ONLY | Classified / deterministic noncurrent duplicate |
| d8e69bd7-b389-f111-ab10-6045bdd69435 | 27 Days to Overcoming Depression | Donjia Walls | YES | DATA_GAP | unresolved | DUPLICATE_HISTORICAL_RECORD_REFERENCE | PUBLISHING_OPERATING_CENTER_WAVE1_2026_09_01:W1-189; canonical authority classification DUPLICATE_RECORD | YES | TRUE_DATA_DEFECT | Suppress/archive noncurrent duplicate reference; do not create lifecycle event | NO | NO | YES_READ_MODEL_SUPPRESSION_ONLY | Classified / deterministic noncurrent duplicate |
| dee69bd7-b389-f111-ab10-6045bdd69435 | 365 Days Of Transparency | Daphanny Baker | YES | DATA_GAP | unresolved | DUPLICATE_HISTORICAL_RECORD_REFERENCE | PUBLISHING_OPERATING_CENTER_WAVE1_2026_09_01:W1-190; canonical authority classification DUPLICATE_RECORD | YES | TRUE_DATA_DEFECT | Suppress/archive noncurrent duplicate reference; do not create lifecycle event | NO | NO | YES_READ_MODEL_SUPPRESSION_ONLY | Classified / deterministic noncurrent duplicate |
| 8e0402da-b389-f111-ab10-000d3a14673b | 7 Step Jumpstart to Becoming Your Best Self | Ericka Johnson Settles | YES | DATA_GAP | unresolved | DUPLICATE_HISTORICAL_RECORD_REFERENCE | PUBLISHING_OPERATING_CENTER_WAVE1_2026_09_01:W1-052; canonical authority classification DUPLICATE_RECORD | YES | TRUE_DATA_DEFECT | Suppress/archive noncurrent duplicate reference; do not create lifecycle event | NO | NO | YES_READ_MODEL_SUPPRESSION_ONLY | Classified / deterministic noncurrent duplicate |
| 4b9a11da-b389-f111-ab10-6045bdd69738 | A Blended Family | Shecara Norris | YES | DATA_GAP | unresolved | DUPLICATE_HISTORICAL_RECORD_REFERENCE | PUBLISHING_OPERATING_CENTER_WAVE1_2026_09_01:W1-191; canonical authority classification DUPLICATE_RECORD | YES | TRUE_DATA_DEFECT | Suppress/archive noncurrent duplicate reference; do not create lifecycle event | NO | NO | YES_READ_MODEL_SUPPRESSION_ONLY | Classified / deterministic noncurrent duplicate |
| 9fe382d8-b389-f111-ab10-6045bdd69678 | A Little Bit of Everything | Eryonna Barrino | YES | DATA_GAP | unresolved | DUPLICATE_HISTORICAL_RECORD_REFERENCE | PUBLISHING_OPERATING_CENTER_WAVE1_2026_09_01:W1-193; canonical authority classification DUPLICATE_RECORD | YES | TRUE_DATA_DEFECT | Suppress/archive noncurrent duplicate reference; do not create lifecycle event | NO | NO | YES_READ_MODEL_SUPPRESSION_ONLY | Classified / deterministic noncurrent duplicate |
| a8e382d8-b389-f111-ab10-6045bdd69678 | A Portrait of Paradise | Iyorwuese Hagher | YES | DATA_GAP | unresolved | DUPLICATE_HISTORICAL_RECORD_REFERENCE | PUBLISHING_OPERATING_CENTER_WAVE1_2026_09_01:W1-055; canonical authority classification DUPLICATE_RECORD | YES | TRUE_DATA_DEFECT | Suppress/archive noncurrent duplicate reference; do not create lifecycle event | NO | NO | YES_READ_MODEL_SUPPRESSION_ONLY | Classified / deterministic noncurrent duplicate |
| abe382d8-b389-f111-ab10-6045bdd69678 | A Principal's Tale | Shelley McIntosh | YES | DATA_GAP | unresolved | DUPLICATE_HISTORICAL_RECORD_REFERENCE | PUBLISHING_OPERATING_CENTER_WAVE1_2026_09_01:W1-195; canonical authority classification DUPLICATE_RECORD | YES | TRUE_DATA_DEFECT | Suppress/archive noncurrent duplicate reference; do not create lifecycle event | NO | NO | YES_READ_MODEL_SUPPRESSION_ONLY | Classified / deterministic noncurrent duplicate |
| 11d2c5d7-b389-f111-ab10-000d3a9eacee | A Truebies Guide, Part 1 | Alesia Corpening | YES | DATA_GAP | unresolved | DUPLICATE_HISTORICAL_RECORD_REFERENCE | PUBLISHING_OPERATING_CENTER_WAVE1_2026_09_01:W1-057; canonical authority classification DUPLICATE_RECORD | YES | TRUE_DATA_DEFECT | Suppress/archive noncurrent duplicate reference; do not create lifecycle event | NO | NO | YES_READ_MODEL_SUPPRESSION_ONLY | Classified / deterministic noncurrent duplicate |
| 2554a0dd-b389-f111-ab10-6045bdd69435 | A Truebies Guide, Part 2 | Alesia Corpening | YES | DATA_GAP | unresolved | DUPLICATE_HISTORICAL_RECORD_REFERENCE | PUBLISHING_OPERATING_CENTER_WAVE1_2026_09_01:W1-060; canonical authority classification DUPLICATE_RECORD | YES | TRUE_DATA_DEFECT | Suppress/archive noncurrent duplicate reference; do not create lifecycle event | NO | NO | YES_READ_MODEL_SUPPRESSION_ONLY | Classified / deterministic noncurrent duplicate |
| f67d1ada-b389-f111-ab10-7c1e525b15c2 | Abortion! | Carolyn Booker-Pierce | YES | DATA_GAP | unresolved | DUPLICATE_HISTORICAL_RECORD_REFERENCE | PUBLISHING_OPERATING_CENTER_WAVE1_2026_09_01:W1-063; canonical authority classification DUPLICATE_RECORD | YES | TRUE_DATA_DEFECT | Suppress/archive noncurrent duplicate reference; do not create lifecycle event | NO | NO | YES_READ_MODEL_SUPPRESSION_ONLY | Classified / deterministic noncurrent duplicate |
| 509a11da-b389-f111-ab10-6045bdd69738 | According to Mark | Alice Pryor | YES | DATA_GAP | unresolved | DUPLICATE_HISTORICAL_RECORD_REFERENCE | PUBLISHING_OPERATING_CENTER_WAVE1_2026_09_01:W1-196; canonical authority classification DUPLICATE_RECORD | YES | TRUE_DATA_DEFECT | Suppress/archive noncurrent duplicate reference; do not create lifecycle event | NO | NO | YES_READ_MODEL_SUPPRESSION_ONLY | Classified / deterministic noncurrent duplicate |
| 8c3582da-b389-f111-ab10-00224820105b | Aligned! | Dennis Brown | YES | DATA_GAP | unresolved | DUPLICATE_HISTORICAL_RECORD_REFERENCE | PUBLISHING_OPERATING_CENTER_WAVE1_2026_09_01:W1-065; canonical authority classification DUPLICATE_RECORD | YES | TRUE_DATA_DEFECT | Suppress/archive noncurrent duplicate reference; do not create lifecycle event | NO | NO | YES_READ_MODEL_SUPPRESSION_ONLY | Classified / deterministic noncurrent duplicate |
| a00402da-b389-f111-ab10-000d3a14673b | Almost Happy | Jaylonna Stevette | YES | DATA_GAP | unresolved | DUPLICATE_HISTORICAL_RECORD_REFERENCE | PUBLISHING_OPERATING_CENTER_WAVE1_2026_09_01:W1-066; canonical authority classification DUPLICATE_RECORD | YES | TRUE_DATA_DEFECT | Suppress/archive noncurrent duplicate reference; do not create lifecycle event | NO | NO | YES_READ_MODEL_SUPPRESSION_ONLY | Classified / deterministic noncurrent duplicate |
| 549a11da-b389-f111-ab10-6045bdd69738 | Are You Sure That You Are Ready? | Ericka Thornton | YES | DATA_GAP | unresolved | DUPLICATE_HISTORICAL_RECORD_REFERENCE | PUBLISHING_OPERATING_CENTER_WAVE1_2026_09_01:W1-199; canonical authority classification DUPLICATE_RECORD | YES | TRUE_DATA_DEFECT | Suppress/archive noncurrent duplicate reference; do not create lifecycle event | NO | NO | YES_READ_MODEL_SUPPRESSION_ONLY | Classified / deterministic noncurrent duplicate |
| 017e1ada-b389-f111-ab10-7c1e525b15c2 | Because the Lord is My Shepherd | Carolyn Booker-Pierce | YES | DATA_GAP | unresolved | DUPLICATE_HISTORICAL_RECORD_REFERENCE | PUBLISHING_OPERATING_CENTER_WAVE1_2026_09_01:W1-068; canonical authority classification DUPLICATE_RECORD | YES | TRUE_DATA_DEFECT | Suppress/archive noncurrent duplicate reference; do not create lifecycle event | NO | NO | YES_READ_MODEL_SUPPRESSION_ONLY | Classified / deterministic noncurrent duplicate |
| a60402da-b389-f111-ab10-000d3a14673b | BEE Careful | Deborah Eiland | YES | DATA_GAP | unresolved | DUPLICATE_HISTORICAL_RECORD_REFERENCE | PUBLISHING_OPERATING_CENTER_WAVE1_2026_09_01:W1-200; canonical authority classification DUPLICATE_RECORD | YES | TRUE_DATA_DEFECT | Suppress/archive noncurrent duplicate reference; do not create lifecycle event | NO | NO | YES_READ_MODEL_SUPPRESSION_ONLY | Classified / deterministic noncurrent duplicate |
| 569a11da-b389-f111-ab10-6045bdd69738 | Biblical Prescriptions For Life's Troubles | Terry Stephens | YES | DATA_GAP | unresolved | DUPLICATE_HISTORICAL_RECORD_REFERENCE | PUBLISHING_OPERATING_CENTER_WAVE1_2026_09_01:W1-205; canonical authority classification DUPLICATE_RECORD | YES | TRUE_DATA_DEFECT | Suppress/archive noncurrent duplicate reference; do not create lifecycle event | NO | NO | YES_READ_MODEL_SUPPRESSION_ONLY | Classified / deterministic noncurrent duplicate |

## Work / Format Separation

The queue items above are work-level reconciliation records. No row is classified as a separate work merely because a paperback, hardcover, eBook, or audio product may exist.

FORMAT_PRODUCT_AUTHORITY = NOT_APPLICABLE_FOR_QUEUE_ROWS
WORK_FORMAT_COLLAPSE_ERRORS = 0

## Active Title Protection Alerts

The following active real-world workstreams are not part of the 19-row reconciliation queue, but the live placed view warrants protection before any future normalization:

| Title/workstream | Runtime readback | Protection classification | Required next action |
| --- | --- | --- | --- |
| Whole | Runtime placed `WHOLENESS - BECOMING` / Jackuline Fly as Post-Publication | ACTIVE_TITLE_PROTECTION_ALERT | Do not normalize from this projection. Use separately governed Whole agreement/commercial evidence before title lifecycle movement. |
| Before You Were Born | Runtime placed as Post-Publication / Sean Crowley | ACTIVE_TITLE_PROTECTION_ALERT | Do not let post-publication projection override active BYWB identifier/distribution workstream. |
| Indomitable | Runtime placed at Author Decision / Package Acceptance | WATCH | Preserve September 14 release authority workstream; no movement from Pipeline-003. |
| Establishing Glory: The Library | Runtime has one blocked Editorial Review row and one Author Decision row | CONFLICTING_STAGE_SIGNAL_ALERT | Keep governed blocker; do not silently choose one stage. |

ACTIVE_TITLE_MUTATIONS = 0

## Safe Remediation Readiness

Recommended bounded remediation sequence:

1. Prepare a provider-free/read-model-only queue refinement that separates `NONCURRENT_REFERENCE_ONLY` duplicate records from true ambiguous active-work reconciliation.
2. Keep the royalty backlog package in reconciliation until founder decisions resolve identity holds, title holds, and payment allocation holds.
3. Add an operator-facing explanation field for each reconciliation row: why it is here, evidence authority, candidate stage, missing evidence, and resolving action.
4. Add a guard that duplicate/noncurrent historical references cannot masquerade as active lifecycle work and cannot be silently placed in any of the 16 stages.
5. Cross-check Whole and BYWB against their dedicated governed workstreams before any lifecycle normalization touches those records.

## Bounded Remediation Executed

READ_MODEL_REMEDIATION = EXECUTED
UI_REMEDIATION = EXECUTED
LIFECYCLE_TRUTH_MUTATION = 0

The Publisher Pipeline reconciliation card now exposes:

- ambiguity reason
- evidence authority
- resolution class
- missing evidence
- proposed repair
- automation safety classification

The existing 16-stage guard was strengthened to require those fields and the operator-facing detail labels. This repair changes operator visibility only; it does not place titles, advance stages, mutate Dataverse, touch provider accounts, or send communications.

## Verification

TYPE_CHECK = PASS
PUBLISHER_PIPELINE_16_STAGE_GUARD = PASS
LINT = PASS_WITH_EXISTING_WARNING
BUILD = PASS_WITH_EXISTING_WARNINGS

Known nonblocking warnings:

- Existing lint warning in `app/layout.tsx` for custom font loading.
- Existing Next.js middleware/proxy migration warning.
- Existing Edge Runtime deprecation warning.
- Existing broad dynamic file pattern warnings in server read-model paths.

## Return

JMP_PIPELINE_003_STATUS = JMP_PIPELINE_003_RECONCILIATION_CLASSIFIED_READY_FOR_REMEDIATION
PR739_STATUS = MERGED
PR739_HEAD = 623c76bb9e3911c0163c310f9e2164471b4ab2af
PR739_MERGE_SHA = fa14d3d78b4baf1d79429132eb337dab183f3a3b
POST_MERGE_MAIN = fa14d3d78b4baf1d79429132eb337dab183f3a3b
PIPELINE_IMPLEMENTATION = CLOSED
PIPELINE_RUNTIME = COMMISSIONED
OPERATING_MODE = NORMAL_OPERATIONS

QUEUE_ITEMS_CAPTURED = 19
UNCLASSIFIED_QUEUE_ITEMS = 0
UNKNOWN_AMBIGUITY_REASON = 0
DETERMINISTIC_REPAIR = 0
GOVERNED_EVENT_BACKFILL_REQUIRED = 0
HUMAN_BUSINESS_DECISION_REQUIRED = 1
EXTERNAL_DEPENDENCY = 0
TRUE_DATA_DEFECT = 18
WORK_FORMAT_COLLAPSE_ERRORS = 0
SILENT_AMBIGUOUS_PLACEMENTS = 0

AUTHOR_RECORD_MUTATIONS = 0
TITLE_LIFECYCLE_MUTATIONS = 0
PROVIDER_ACTIONS = 0
DISTRIBUTION_MUTATIONS = 0
AUTHOR_COMMUNICATIONS = 0
COMMERCIAL_MUTATIONS = 0
PRODUCTION_DEPLOYMENT_REQUIRED = YES_AFTER_CODE_MERGE
