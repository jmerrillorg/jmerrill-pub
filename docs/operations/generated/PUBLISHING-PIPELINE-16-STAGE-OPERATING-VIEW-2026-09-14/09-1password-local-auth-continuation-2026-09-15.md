# 1Password Local Auth Continuation

Generated: 2026-09-15 EDT

## Work package

JMP-PIPELINE-AUTH-001 - 1Password Local Auth Commissioning and Runtime Certification

## Current branch authority

- PR = `https://github.com/jmerrillorg/jmerrill-pub/pull/737`
- Canonical main at reconciliation = `c43ed04ce820bf024b680ecad4b39ad00155e51a`
- Current branch head before this evidence = `e797a605c41f5081933caeec95423b1042dd5982`
- Local URL = `http://localhost:3001`
- Local callback URI = `http://localhost:3001/api/auth/callback/jm1-publisher-operating-center`

## 1Password tooling

- 1Password desktop application = AVAILABLE
- 1Password desktop account = `JMerrill`
- 1Password CLI `op` = NOT_AVAILABLE_ON_PATH
- 1Password Developer Environments = NONE_CONFIGURED
- ONEPASSWORD_SECRET_VALUES_LOGGED = 0

## 1Password item discovery

Target governed app:

- App name = `JM1 Publisher Operating Center`
- Client id = `7bd27a68-fda7-4330-9198-d493f2a0a5ef`
- Tenant id = `352d075e-8e17-4169-9f8e-22e6946ce66d`

Searches performed, metadata only:

- `JM1 Publisher Operating Center` = NOT_FOUND
- `Publisher Operating Center` = NOT_FOUND
- `7bd27a68` = NOT_FOUND
- `PUBLISHER_OPERATING_CENTER_CLIENT_SECRET` = NOT_FOUND
- `jmerrill-pub` = broad provider-login results only, no governed app-secret record proven
- `jmerrill-pub-20260818-rotation` = NOT_FOUND
- `jmerrill-pub-20260715` = NOT_FOUND

ONEPASSWORD_ITEM_FOUND =
NO

CLIENT_SECRET_PRESENT =
NO_IN_PROVEN_1PASSWORD_SOURCE

## Entra credential metadata

The governed Entra application has current password credential metadata:

- `jmerrill-pub-20260715`, key id `4afb2f1a-28d7-4d38-b30d-097fbce863f3`, expires `2027-07-15T08:07:24Z`
- `jmerrill-pub-20260818-rotation`, key id `ee63b16f-c8b1-4237-8a35-c893a27d86a5`, expires `2027-08-18T09:52:28Z`
- `jmerrill-pub-20260818-rotation`, key id `d5194bee-6eac-4631-af19-9edc485a23fe`, expires `2027-08-18T09:52:36Z`

This proves the app registration has current credentials by metadata. It does not provide the secret value needed for localhost runtime injection, and no secret value was retrieved.

- ENTRA_APPLICATION_MATCH = YES
- TENANT_MATCH = YES
- CLIENT_SECRET_CURRENT = YES_BY_ENTRA_METADATA
- CLIENT_SECRET_VALID_FOR_LOCAL_RUNTIME = NOT_VERIFIED_BECAUSE_SECRET_VALUE_NOT_AVAILABLE_FROM_1PASSWORD

## Callback registration retained

The localhost:3001 callback remains registered on the existing governed app:

- `http://localhost:3001/api/auth/callback/jm1-publisher-operating-center`

Production/staging redirect URI preservation:

- `https://jmerrill.pub/api/auth/callback/jm1-publisher-operating-center` = PRESENT
- `https://app-jm1-pub-prod-v2-staging.azurewebsites.net/api/auth/callback/jm1-publisher-operating-center` = PRESENT
- PRODUCTION_REDIRECT_URIS_CHANGED = NO

## Runtime certification outcome

Authenticated local runtime certification could not proceed because the governed local secret source is still absent.

- LOCAL_AUTH_SECRET = BLOCKED
- SECRET_SOURCE = 1PASSWORD_INTENDED_BUT_NOT_AVAILABLE
- SERVER_START = NOT_RUN_AFTER_SECRET_SOURCE_BLOCKER
- AUTH_PROVIDER_INITIALIZATION = NOT_CERTIFIED
- ENTRA_LOGIN = FAIL_NOT_ATTEMPTED_WITHOUT_SECRET_SOURCE
- AUTH_CALLBACK = FAIL_NOT_CERTIFIED
- SESSION = FAIL_NOT_CERTIFIED
- PIPELINE_AUTHENTICATED_RENDER = FAIL_NOT_CERTIFIED
- PIPELINE_API_AUTHENTICATED = FAIL_NOT_CERTIFIED
- PIPELINE_STAGE_COUNT = 16_BY_STATIC_GUARD
- TITLE_RECONCILIATION = FAIL_AUTHENTICATED_RUNTIME_NOT_CERTIFIED
- OPERATING_CENTER_AUTHENTICATED_REGRESSION = FAIL_NOT_CERTIFIED
- ANONYMOUS_ACCESS_DENIAL = NOT_RERUN_AFTER_SECRET_SOURCE_BLOCKER

## Full regression readback

After branch reconciliation and evidence update:

- TYPE_CHECK = PASS
- WORKFLOW_ENGINE_GUARD = PASS
- 16_STAGE_GUARD = PASS
- CAP008_ROUTING = PASS
- AUTHOR_AUTH_GUARD = PASS
- PROVIDER_AUTH_GUARD = PASS
- RELEVANT_AZURE_FUNCTION_TESTS = PASS
- LINT = PASS_WITH_EXISTING_FONT_WARNING
- BUILD = PASS_WITH_EXISTING_WARNINGS
- SECRET_SCAN = PASS
- GIT_DIFF_CHECK = PASS

## Secret hygiene

- SECRET_VALUES_TRACKED = 0
- SECRET_VALUES_IN_EVIDENCE = 0
- SECRET_VALUES_IN_GIT_DIFF = 0
- SHELL_HISTORY_SECRET_EXPOSURE = 0
- `.env.local` committed = NO
- local plaintext secret file created = NO
- production client secret rotated = NO
- production App Service auth altered = NO
- managed identity runtime altered = NO
- production deployment performed = NO

SECRET_HYGIENE =
PASS

## Classification

JMP_PIPELINE_AUTH_001_STATUS =
JMP_PIPELINE_AUTH_001_PARTIAL

Remaining blocker:

The governed Publisher Entra app and localhost:3001 callback are ready, and Entra credential metadata is current, but there is no proven 1Password item, 1Password Developer Environment, `op run` source, or other governed local secret-injection mechanism containing the Publisher client secret and local `AUTH_SECRET`.

Next action:

Create or identify a governed 1Password Developer Environment or item for local Publisher auth containing only the required secret values, then rerun the real localhost authentication proof. Do not create or rotate Entra credentials unless the existing secret value is proven unavailable or invalid by separate credential-renewal authority.
