# JMP Pipeline 002 Production Deployment and Live Certification

Date: 2026-09-15  
Stream: JMP Publisher Pipeline - Production Deployment and Live Runtime Certification  
Work package: JMP-PIPELINE-002  
Final classification: JMP_PIPELINE_002_PRODUCTION_CERTIFICATION_PASS

## Source and Merge

SOURCE_WORKSTREAM = JMP-PIPELINE-AUTH-001  
SOURCE_STATUS = JMP_PIPELINE_AUTH_001_PASS_WITH_LOCAL_TOOLING_FOLLOWUP  
PR737 = https://github.com/jmerrillorg/jmerrill-pub/pull/737  
PR737_ORIGINAL_HEAD_SHA = d903c1b9aa20669d75a2a6a20c3b24b986a3f361  
PR737_FINAL_HEAD_SHA = 38b80a1ec83f88503a2e6bd0731ab0ec5708f8e4  
PRE_MERGE_MAIN = c43ed04ce820bf024b680ecad4b39ad00155e51a  
PR737_MERGE_SHA = b3ff061eb75e60da9aa274df01f3a7df31fa9080  
PR737_MERGED_AT = 2026-09-15T11:07:43Z

PR737 scope was confined to:

- Publisher Pipeline UI and route
- Publisher Pipeline API route
- Operating Center navigation integration
- Human pipeline read model
- Publisher auth support
- 16-stage guard
- Commissioning evidence

STALE_OVERWRITE_RISK = 0  
UNRELATED_PATHS = 0  
SECRET_VALUES = 0

## Pre-Merge Verification

Verification was executed in an isolated clean worktree based on current `origin/main`.

TYPE_CHECK = PASS  
WORKFLOW_ENGINE_GUARD = PASS  
PUBLISHER_PIPELINE_16_STAGE_GUARD = PASS  
LINT = PASS_WITH_EXISTING_WARNING  
BUILD = PASS_WITH_EXISTING_WARNINGS  
AUTHOR_AUTH_GUARD = PASS  
JMP_AUTH_003_MANAGED_IDENTITY_RUNTIME_GUARD = PASS  
JMP_DIST_003_PROVIDER_AUTH_GUARD = PASS  
JMP_DIST_001_PROVIDER_CONNECTORS_GUARD = PASS  
JMP_DIST_002_LIVE_CANARY_GATE_GUARD = PASS  
PRODUCTION_PIPELINE_V2_DOCTRINE_AND_RUNTIME_POLICY = PASS  
GIT_DIFF_CHECK = PASS_AFTER_WHITESPACE_FIX  
SECRET_PATTERN_SCAN = PASS

Known nonblocking warnings:

- Local verification runtime used Node 22 while the repository declares Node 24.
- Existing lint warning in `app/layout.tsx` for custom font loading.
- Existing Next.js build warnings for middleware/proxy migration, Edge Runtime deprecation, and broad dynamic file patterns in existing server read-model paths.
- Existing npm audit/deprecation warnings.

## Production Deployment

PRODUCTION_DEPLOYMENT_WORKFLOW = Deploy J Merrill Publishing to Premium App Service  
PRODUCTION_DEPLOYMENT_RUN = 34961603030  
PRODUCTION_DEPLOYMENT_URL = https://github.com/jmerrillorg/jmerrill-pub/actions/runs/34961603030  
DEPLOYED_SHA = b3ff061eb75e60da9aa274df01f3a7df31fa9080  
DEPLOYMENT_STARTED = 2026-09-15T11:07:46Z  
DEPLOYMENT_COMPLETED = 2026-09-15T11:09:29Z  
DEPLOYMENT_RESULT = SUCCESS

Initial live certification discovered a production UI hydration warning:

DEFECT = React hydration error #418 on Publisher Pipeline render/refresh  
DEFECT_CLASS = ORDINARY_IMPLEMENTATION_DEFECT  
ROOT_CAUSE = Runtime-default timezone formatting for generated timestamps could differ between Azure server render and browser hydration.

## Defect Repair

PR738 = https://github.com/jmerrillorg/jmerrill-pub/pull/738  
PR738_HEAD_SHA = 79428dad73c4a32232a7de08b77275a59ff12fa8  
PR738_MERGE_SHA = 483061b104d474b68bbfb6692120b72d2e790d56  
PR738_MERGED_AT = 2026-09-15T11:15:50Z

Repair:

- Pinned Publisher Pipeline generated timestamp formatting to `America/New_York`.
- Pinned Publisher Operating Center generated timestamp formatting to `America/New_York`.

Repair verification:

TYPE_CHECK = PASS  
LINT = PASS_WITH_EXISTING_WARNING  
PUBLISHER_PIPELINE_16_STAGE_GUARD = PASS  
BUILD = PASS_WITH_EXISTING_WARNINGS  
GIT_DIFF_CHECK = PASS  
SECRET_PATTERN_SCAN = PASS

## Final Production Deployment

FINAL_PRODUCTION_DEPLOYMENT_RUN = 34962349974  
FINAL_PRODUCTION_DEPLOYMENT_URL = https://github.com/jmerrillorg/jmerrill-pub/actions/runs/34962349974  
FINAL_DEPLOYED_SHA = 483061b104d474b68bbfb6692120b72d2e790d56  
FINAL_DEPLOYMENT_STARTED = 2026-09-15T11:15:53Z  
FINAL_DEPLOYMENT_COMPLETED = 2026-09-15T11:17:33Z  
FINAL_DEPLOYMENT_RESULT = SUCCESS

Production health readback:

PUBLIC_SITE_HEALTH = PASS  
HEALTH_ROUTE = https://jmerrill.pub/api/health  
HEALTH_STATUS = ready  
HEALTH_RELEASE = 483061b104d474b68bbfb6692120b72d2e790d56  
DATAVERSE_RUNTIME_AUTH = READY / MANAGED_IDENTITY  
GRAPH_RUNTIME_AUTH = READY / MANAGED_IDENTITY  
FUNCTION_API_HEALTH = PASS  
MATERIAL_5XX_REGRESSION = NO

## Live Authenticated Browser Proof

PRODUCTION_URL = https://jmerrill.pub/publisher/pipeline  
AUTHENTICATED_OPERATOR = jm1-admin@jmerrill.one  
MICROSOFT_LOGIN = PASS_EXISTING_SESSION  
AUTH_CALLBACK = PASS_EXISTING_SESSION  
SESSION = PASS  
PIPELINE_AUTHENTICATED_RENDER = PASS  
LIVE_BROWSER_PROOF = PASS  
POST_REPAIR_CONSOLE_ERRORS = 0

Pipeline UI proof:

PIPELINE_STAGE_COUNT = 16  
ALL_16_STAGE_HEADERS = PASS  
00_TEMPLATE_VISIBLE = NO  
LAYOUT = PASS  
NAVIGATION = PASS  
NO_BROWSER_LOCAL_LIFECYCLE_AUTHORITY = PASS

Canonical stage headers observed:

1. Inquiry
2. Intake
3. Review
4. Decision
5. Agreement
6. Onboarding
7. Developmental
8. Line
9. Copyediting
10. Proofreading
11. Layout
12. Cover
13. Production
14. Distribution
15. Publication
16. Post-Pub

The UI also rendered the reconciliation panel `Titles not silently placed`, which is not a lifecycle stage.

## Production Pipeline Data Readback

DATA_AUTHORITY = Dataverse-backed Publisher Operating Center snapshot and canonical lifecycle read model  
SYNTHETIC_DATA = NO  
LOCAL_FIXTURE_DATA = NO

TOTAL_TITLES = 31  
PLACED_TITLES = 12  
UNPLACED_TITLES = 19  
AMBIGUOUS_TITLES = 19  
DUPLICATE_PROJECTIONS = 0

TITLES_BY_STAGE:

| Stage | Count |
| --- | ---: |
| 01 - Inquiry | 2 |
| 02 - Intake | 0 |
| 03 - Review | 1 |
| 04 - Decision | 5 |
| 05 - Agreement | 0 |
| 06 - Onboarding | 1 |
| 07 - Developmental | 0 |
| 08 - Line | 0 |
| 09 - Copyediting | 0 |
| 10 - Proofreading | 0 |
| 11 - Layout | 0 |
| 12 - Cover | 0 |
| 13 - Production | 0 |
| 14 - Distribution | 0 |
| 15 - Publication | 0 |
| 16 - Post-Pub | 3 |
| Reconciliation - Titles not silently placed | 19 |

Additional summary counts:

NEEDS_JACKIE = 0  
WAITING_AUTHOR = 2  
WAITING_SYSTEM = 2  
BLOCKED = 4  
EXCEPTIONS = 19  
RECONCILE = 19

TITLE_RECONCILIATION = PASS_WITH_EXPLICIT_RECONCILIATION_QUEUE  
SILENT_AMBIGUOUS_PLACEMENT = 0  
UNKNOWN_STAGE_MAPPINGS = 0  
DUPLICATE_TITLE_PROJECTIONS = 0

## API and Anonymous Denial

PIPELINE_API_AUTHENTICATED = PASS_VIA_AUTHENTICATED_REFRESH_CONTROL  
PIPELINE_API_RAW_JSON_EXPORT = BLOCKED_BY_BROWSER_AUTOMATION_LAYER  
PIPELINE_API_RAW_JSON_EXPORT_NOTES = The browser automation sandbox exposed neither `fetch` nor `XMLHttpRequest`, and direct browser navigation to the API endpoint was blocked by the browser client. The in-session Pipeline refresh control completed after repair with stable production counts and zero console errors.

ANONYMOUS_ACCESS_DENIAL = PASS  
ANONYMOUS_PIPELINE_API_STATUS = 401  
ANONYMOUS_PIPELINE_API_ERROR = Publisher session not found.  
ANONYMOUS_PIPELINE_UI_DATA_EXPOSURE = NO  
ANONYMOUS_PIPELINE_UI_STATE = Sign-in screen only

## Operating Center Regression

OPERATING_CENTER_RENDER = PASS  
OPERATING_CENTER_DATA = PASS  
OPERATING_CENTER_TO_PIPELINE = PASS  
PIPELINE_TO_OPERATING_CENTER = PASS  
AUTH_SESSION_CONTINUITY = PASS  
OPERATING_CENTER_AUTHENTICATED_REGRESSION = PASS  
REGRESSION = 0

## Nonmutation Boundaries

PUBLISHER_AUTH_REGRESSION = PASS  
DISTRIBUTION_NONREGRESSION = PASS  
PROVIDER_ACTIONS = 0  
DISTRIBUTION_MUTATIONS = 0  
PUBLIC_PRODUCTS_CREATED = 0  
ON_SALE_PRODUCTS_CREATED = 0  
AUTHOR_RECORD_MUTATIONS = 0  
TITLE_STAGE_TEST_MUTATIONS = 0  
WRONG_TITLE_EFFECTS = 0  
WRONG_FORMAT_EFFECTS = 0  
AUTHOR_COMMUNICATIONS = 0  
UNAUTHORIZED_PRODUCTION_MUTATIONS = 0

## Follow-Up Registration

ONEPASSWORD_CLI_FOLLOWUP = REGISTERED_WITH_TECH_CURRENCY  
LOCAL_DEV_CREDENTIAL_EXPIRATION = 2026-12-14T23:59:59Z  
LOCAL_DEV_CREDENTIAL_CLASSIFICATION = LOCAL_DEVELOPMENT_ONLY  
PRODUCTION_DEPENDENCY_ON_LOCAL_CLIENT_SECRET = NO

## Final Return

JMP_PIPELINE_002_STATUS = JMP_PIPELINE_002_PRODUCTION_CERTIFICATION_PASS  
PR737_MERGE_SHA = b3ff061eb75e60da9aa274df01f3a7df31fa9080  
CANONICAL_MAIN_SHA = 483061b104d474b68bbfb6692120b72d2e790d56  
PRODUCTION_DEPLOYMENT_RUN = 34962349974  
DEPLOYED_SHA = 483061b104d474b68bbfb6692120b72d2e790d56  
PRODUCTION_HEALTH = PASS  
ENTRA_LOGIN = PASS_EXISTING_SESSION  
AUTH_CALLBACK = PASS_EXISTING_SESSION  
SESSION = PASS  
PIPELINE_AUTHENTICATED_RENDER = PASS  
PIPELINE_API_AUTHENTICATED = PASS_VIA_AUTHENTICATED_REFRESH_CONTROL  
PIPELINE_STAGE_COUNT = 16  
TOTAL_TITLES = 31  
PLACED_TITLES = 12  
UNPLACED_TITLES = 19  
AMBIGUOUS_TITLES = 19  
DUPLICATE_PROJECTIONS = 0  
TITLE_RECONCILIATION = PASS_WITH_EXPLICIT_RECONCILIATION_QUEUE  
SILENT_AMBIGUOUS_PLACEMENT = 0  
OPERATING_CENTER_AUTHENTICATED_REGRESSION = PASS  
ANONYMOUS_ACCESS_DENIAL = PASS  
PUBLISHER_AUTH_REGRESSION = PASS  
DISTRIBUTION_NONREGRESSION = PASS  
AUTHOR_RECORD_MUTATIONS = 0  
TITLE_STAGE_TEST_MUTATIONS = 0  
PROVIDER_ACTIONS = 0  
AUTHOR_COMMUNICATIONS = 0  
LIVE_BROWSER_PROOF = PASS  
FULL_REGRESSION = PASS_WITH_ONLY_KNOWN_NONBLOCKING_WARNINGS  
ONEPASSWORD_CLI_FOLLOWUP = REGISTERED_WITH_TECH_CURRENCY  
LOCAL_DEV_CREDENTIAL_EXPIRATION = 2026-12-14T23:59:59Z  
UNAUTHORIZED_PRODUCTION_MUTATIONS = 0  
FOUNDER_DECISIONS_REQUIRED = 0  
NEXT_ACTION = Close Publisher 16-stage Pipeline commissioning and move into normal operations/observation.
