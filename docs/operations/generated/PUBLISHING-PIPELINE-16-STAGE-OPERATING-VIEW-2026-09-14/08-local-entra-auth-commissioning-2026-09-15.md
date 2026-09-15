# Local Entra Auth Commissioning

Generated: 2026-09-15 EDT

## Work package

JMP-PUB-PIPELINE-AUTH-001 - Local Publisher Authentication Commissioning

## Starting point

- Current branch commit before this continuation = `a88f6b001d270da855b92b448d30ddce565966f3`
- Current canonical main after fetch = `c43ed04ce820bf024b680ecad4b39ad00155e51a`
- Branch reconciliation = PASS
- Rebased pipeline branch onto current `origin/main` without conflicts.

## Entra application readback

- APP_NAME = `JM1 Publisher Operating Center`
- CLIENT_ID = `7bd27a68-fda7-4330-9198-d493f2a0a5ef`
- TENANT_ID = `352d075e-8e17-4169-9f8e-22e6946ce66d`
- APPLICATION_OBJECT_ID = `41049585-dc3d-405b-8ac3-b052fb236386`
- CURRENT_SUPPORTED_ACCOUNT_TYPE = `AzureADMyOrg`
- CURRENT_LOGOUT_URIS = none
- CURRENT_SPA_REDIRECT_URIS = none
- CORRECT_APP = YES
- CORRECT_TENANT = YES

## Callback URI model

Source-derived provider id:

- `jm1-publisher-operating-center`

Source-derived NextAuth callback route:

- `/api/auth/callback/jm1-publisher-operating-center`

Local preview authority:

- LOCAL_APP_URL = `http://localhost:3001`
- LOCAL_CALLBACK_URI = `http://localhost:3001/api/auth/callback/jm1-publisher-operating-center`

## Callback registration

The exact localhost:3001 callback URI was absent before this continuation and was added to the existing governed Publisher application.

Current web redirect URI readback after update:

- `http://localhost:3000/api/auth/callback/jm1-publisher-operating-center`
- `http://localhost:3001/api/auth/callback/jm1-publisher-operating-center`
- `https://jmerrill.pub/api/auth/callback/jm1-publisher-operating-center`
- `https://jmerrill.one/api/auth/callback/azure-ad`
- `https://app-jm1-pub-prod-v2-staging.azurewebsites.net/api/auth/callback/jm1-publisher-operating-center`

- LOCAL_CALLBACK_REGISTERED = YES
- PRODUCTION_REDIRECT_URIS_REMOVED = 0
- PRODUCTION_REDIRECT_URIS_CHANGED = NO
- PRODUCTION_AUTH_BEHAVIOR_CHANGED = NO

## Local configuration contract

Repository authority:

- `.env.example`
- `.gitignore`
- `lib/server/author-durable-auth.ts`
- `infra/jm1-infra-006/app-service/main.bicep`

Canonical local variables for Publisher local preview:

- `NEXTAUTH_URL`
- `AUTH_SECRET`
- `PUBLISHER_OPERATING_CENTER_CLIENT_ID`
- `PUBLISHER_OPERATING_CENTER_CLIENT_SECRET`
- `PUBLISHER_OPERATING_CENTER_TENANT_ID`
- `PUBLISHER_OPERATING_CENTER_ALLOWED_EMAILS`

Local `.env.local` state in the dedicated worktree:

- `.env.local` = ABSENT
- `.env.local` ignored by Git = PASS
- `.env` ignored by Git = PASS

Shell environment presence, metadata only:

- `AUTH_SECRET` = ABSENT
- `NEXTAUTH_SECRET` = ABSENT
- `NEXTAUTH_URL` = ABSENT
- `PUBLISHER_OPERATING_CENTER_CLIENT_ID` = ABSENT
- `PUBLISHER_OPERATING_CENTER_CLIENT_SECRET` = ABSENT
- `PUBLISHER_OPERATING_CENTER_TENANT_ID` = ABSENT
- `PUBLISHER_OPERATING_CENTER_ALLOWED_EMAILS` = ABSENT

## 1Password secret-source readback

1Password desktop app was open and unlocked.

1Password CLI:

- `op` CLI = NOT_AVAILABLE_ON_PATH

1Password Developer Environments:

- EXISTING_ENVIRONMENT = NO

1Password item discovery:

- exact item `JM1 Publisher Operating Center` = NOT_FOUND
- exact client id search = NOT_FOUND
- exact variable-name search for `PUBLISHER_OPERATING_CENTER_CLIENT_SECRET` = NOT_FOUND
- broader Azure/provider-login records = PRESENT_BUT_NOT_PROVEN_AS_GOVERNED_PUBLISHER_APP_SECRET_SOURCE

No 1Password item was proven to contain the governed Publisher application client secret or local `AUTH_SECRET` source.

## Runtime certification result

The localhost callback authority is now corrected, but authenticated local runtime commissioning did not proceed because governed local secret injection was not available.

- HTTP_LOCAL_PREVIEW = NOT_RUN_AFTER_SECRET_SOURCE_BLOCKER
- AUTH_PROVIDER_INITIALIZATION = NOT_CERTIFIED
- NO_MISSING_PROVIDER_CONFIGURATION = FAIL
- AZURE_AD_LOGIN = FAIL
- LOGIN_REDIRECT = NOT_CERTIFIED
- MICROSOFT_LOGIN = NOT_CERTIFIED
- CALLBACK = NOT_CERTIFIED
- SESSION_CREATED = NOT_CERTIFIED
- SESSION_READBACK = NOT_CERTIFIED
- SAME_PORT_CALLBACK = CALLBACK_URI_REGISTERED / LOGIN_NOT_CERTIFIED
- PIPELINE_AUTHENTICATED_RENDER = FAIL
- PIPELINE_API_AUTHENTICATED = FAIL
- PIPELINE_16_STAGE_RENDER = PASS_BY_STATIC_GUARD / AUTHENTICATED_RENDER_NOT_CERTIFIED
- TITLE_RECONCILIATION = PASS_BY_STATIC_GUARD / AUTHENTICATED_RUNTIME_NOT_CERTIFIED
- OPERATING_CENTER_AUTHENTICATED_REGRESSION = FAIL
- ANONYMOUS_ACCESS_DENIAL = NOT_RERUN_AFTER_SECRET_SOURCE_BLOCKER

## Regression results retained

After branch reconciliation, the existing local regression checks passed:

- TYPE_CHECK = PASS
- WORKFLOW_ENGINE_GUARD = PASS
- 16_STAGE_GUARD = PASS
- CAP008_ROUTING = PASS
- LINT = PASS_WITH_EXISTING_FONT_WARNING
- BUILD = PASS_WITH_EXISTING_FONT_WARNING_AND_EXISTING_EDGE_STATIC_GENERATION_WARNING

## Secret hygiene

- SECRET_VALUES_TRACKED = 0
- SECRET_VALUES_IN_EVIDENCE = 0
- SECRET_VALUES_IN_GIT_DIFF = 0
- `.env.local` committed = NO
- local runtime secret file created = NO
- production client secrets rotated = NO
- production App Service auth altered = NO
- managed identity runtime altered = NO
- deployment performed = NO

SECRET_HYGIENE = PASS

## Final classification

JMP_PIPELINE_AUTH_001_STATUS =
JMP_PIPELINE_AUTH_001_BLOCKED_BY_ENTRA_CONFIGURATION

Single remaining blocker:

Approved local Publisher Entra secret source is still absent. The callback URI is now registered for port 3001, but no governed 1Password item, 1Password Developer Environment, `op run` source, ignored `.env.local`, or developer environment provided the required Publisher OAuth client secret and local auth/session secret material for actual authenticated runtime proof.

## Final return

CANONICAL_MAIN_SHA =
`c43ed04ce820bf024b680ecad4b39ad00155e51a`

LOCAL_PORT =
3001

LOCAL_URL =
`http://localhost:3001`

AUTH_APP =
`JM1 Publisher Operating Center`

AZURE_CLIENT_ID =
not configured locally / governed app metadata present

AZURE_TENANT =
not configured locally / governed tenant metadata present

AUTH_SECRET =
not configured

AZURE_CLIENT_SECRET =
not configured through governed local source

LOCAL_CALLBACK_URI =
`http://localhost:3001/api/auth/callback/jm1-publisher-operating-center`

LOCAL_CALLBACK_REGISTERED =
YES

PRODUCTION_REDIRECT_URIS_CHANGED =
NO

AZURE_AD_LOGIN =
FAIL

AUTH_CALLBACK =
FAIL

SESSION =
FAIL

PIPELINE_AUTHENTICATED_RENDER =
FAIL

PIPELINE_API_AUTHENTICATED =
FAIL

PIPELINE_16_STAGE_RENDER =
PASS_BY_STATIC_GUARD

TITLE_RECONCILIATION =
FAIL_AUTHENTICATED_RUNTIME_NOT_CERTIFIED

OPERATING_CENTER_AUTHENTICATED_REGRESSION =
FAIL

ANONYMOUS_ACCESS_DENIAL =
NOT_RERUN_AFTER_SECRET_SOURCE_BLOCKER

SECRET_HYGIENE =
PASS

READY_FOR_DEPLOYMENT_AUTHORIZATION =
NO
