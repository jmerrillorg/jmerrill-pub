# Authentication Commissioning Continuation

Generated: 2026-09-14 EDT

## Scope

This continuation attempted to complete local preview authentication commissioning for:

- `/publisher/pipeline`
- `/api/publisher/pipeline`
- `/publisher/operating-center`

No pipeline redesign, 16-stage projection change, deployment, production data mutation, Azure identity mutation, SharePoint mutation, Dataverse mutation, email send, author-data mutation, or title-lifecycle mutation was performed.

## Configuration authority discovered

Repository-controlled authority:

- `.env.example` documents local/developer variables for `NEXTAUTH_URL`, `AUTH_SECRET`, `PUBLISHER_OPERATING_CENTER_CLIENT_ID`, `PUBLISHER_OPERATING_CENTER_CLIENT_SECRET`, `PUBLISHER_OPERATING_CENTER_TENANT_ID`, and `PUBLISHER_OPERATING_CENTER_ALLOWED_EMAILS`.
- `.gitignore` excludes `.env` and `.env.local`.
- `lib/server/author-durable-auth.ts` registers the Publisher Azure/Entra provider only when publisher client id, client secret, and tenant id are all present.
- `app/publisher/_components/PublisherPipelineClient.tsx` and `app/publisher/_components/PublisherOperatingCenterClient.tsx` prefer `jm1-publisher-operating-center` when that provider is registered.
- `infra/jm1-infra-006/app-service/main.bicep` configures production/staging App Service settings and Key Vault references for `NEXTAUTH_URL`, `AUTH_SECRET`, `NEXTAUTH_SECRET`, and publisher OAuth variables.

Governed production readback, metadata only:

- Production App Service = `app-jm1-pub-prod-v2`
- Resource group = `rg-jm1-web-prod-premium`
- `NEXTAUTH_URL` = PRESENT
- `AUTH_SECRET` = PRESENT
- `NEXTAUTH_SECRET` = PRESENT
- `PUBLISHER_OPERATING_CENTER_CLIENT_ID` = PRESENT
- `PUBLISHER_OPERATING_CENTER_CLIENT_SECRET` = PRESENT
- `PUBLISHER_OPERATING_CENTER_TENANT_ID` = PRESENT
- `PUBLISHER_OPERATING_CENTER_ALLOWED_EMAILS` = PRESENT

No secret values were read into evidence.

## Existing Publisher app registration

Existing governed app registration:

- Display name = `JM1 Publisher Operating Center`
- App/client id = `7bd27a68-fda7-4330-9198-d493f2a0a5ef`
- Object id = `41049585-dc3d-405b-8ac3-b052fb236386`

Registered web redirect URIs, metadata only:

- `http://localhost:3000/api/auth/callback/jm1-publisher-operating-center`
- `https://jmerrill.pub/api/auth/callback/jm1-publisher-operating-center`
- `https://jmerrill.one/api/auth/callback/azure-ad`
- `https://app-jm1-pub-prod-v2-staging.azurewebsites.net/api/auth/callback/jm1-publisher-operating-center`

Required preview callback for this commissioning:

- `http://localhost:3001/api/auth/callback/jm1-publisher-operating-center`

CALLBACK_URI =
PRESENT_UNVERIFIED_FOR_CANONICAL_APP / ABSENT_FOR_PORT_3001_PREVIEW

No localhost:3001 redirect URI was added.

## Local/developer environment classification

Dedicated worktree:

- `/Volumes/UsersExternal/Developer/codex-worktrees/jmerrill-pub-publisher-pipeline-16-stage`

Local secret-bearing files:

- `.env.local` = ABSENT
- `.env.local` ignored by Git = PASS
- `.env` ignored by Git = PASS

Shell environment, presence metadata only:

- `AUTH_SECRET` = ABSENT
- `NEXTAUTH_SECRET` = ABSENT
- `NEXTAUTH_URL` = ABSENT
- `PUBLISHER_OPERATING_CENTER_CLIENT_ID` = ABSENT
- `PUBLISHER_OPERATING_CENTER_CLIENT_SECRET` = ABSENT
- `PUBLISHER_OPERATING_CENTER_TENANT_ID` = ABSENT
- `PUBLISHER_OPERATING_CENTER_ALLOWED_EMAILS` = ABSENT

Requirement classification:

- AUTH_SECRET = ABSENT
- NEXTAUTH_URL = ABSENT
- AZURE / ENTRA CLIENT ID = ABSENT_FOR_LOCAL_PREVIEW
- AZURE / ENTRA CLIENT SECRET = ABSENT_FOR_LOCAL_PREVIEW
- AZURE / ENTRA TENANT = ABSENT_FOR_LOCAL_PREVIEW
- AUTHORIZED CALLBACK URI = ABSENT_FOR_PORT_3001_PREVIEW

## Fail-closed commissioning result

Port 3001 was not serving at the time of continuation readback.

Because required local Publisher OAuth credentials and the localhost:3001 callback authority were absent from the approved local/developer environment, the task stopped before attempting interactive Azure/Entra login.

- AZURE_AD_LOGIN = BLOCKED_LOCAL_PROVIDER_CONFIGURATION_ABSENT
- AUTH_CALLBACK_RESULT = PASS_SAME_PORT_AFTER_LOCAL_NEXTAUTH_URL_PREVIOUSLY_PROVEN / BLOCKED_FOR_AZURE_PROVIDER_ON_PORT_3001
- PIPELINE_AUTHENTICATED_RENDER = NOT_CERTIFIED
- PIPELINE_API_AUTHENTICATED = NOT_CERTIFIED
- OPERATING_CENTER_AUTHENTICATED_REGRESSION = NOT_CERTIFIED
- READY_FOR_DEPLOYMENT_AUTHORIZATION = NO

Single blocking condition:

Approved local preview Publisher Entra configuration is absent for `http://localhost:3001`, including local secret/URL settings and an authorized localhost:3001 callback URI for the governed Publisher app registration.

## Regression validation

- TYPE_CHECK = PASS
- LINT = PASS_WITH_EXISTING_FONT_WARNING
- WORKFLOW_ENGINE_GUARD = PASS
- 16_STAGE_GUARD = PASS
- CAP008_ROUTING = PASS
- BUILD = PASS_WITH_EXISTING_FONT_WARNING_AND_EXISTING_EDGE_STATIC_GENERATION_WARNING

No new runtime/source changes were made in this continuation.

## Secret hygiene

- No `.env.local` or equivalent secret-bearing file was tracked.
- No secret value was printed into this evidence.
- No token, cookie, authorization code, client secret, password, OTP material, private key, or recovery code was recorded.
- No secret-bearing file was staged.

SECRET_HYGIENE = PASS

## Final operational level-set

AUTH_CONFIGURATION_AUTHORITY =
REPOSITORY_ENV_TEMPLATE_FOR_LOCAL_DEVELOPMENT / APP_SERVICE_KEY_VAULT_REFERENCES_FOR_PRODUCTION

AUTH_SECRET =
ABSENT_FOR_LOCAL_PREVIEW / PRESENT_IN_PRODUCTION_METADATA

NEXTAUTH_URL =
ABSENT_FOR_LOCAL_PREVIEW / SHOULD_BE_HTTP_LOCALHOST_3001_FOR_THIS_PREVIEW

AZURE_CLIENT_ID =
ABSENT_FOR_LOCAL_PREVIEW / EXISTING_GOVERNED_APP_METADATA_PRESENT

AZURE_CLIENT_SECRET =
ABSENT_FOR_LOCAL_PREVIEW / PRESENT_IN_PRODUCTION_METADATA

AZURE_TENANT =
ABSENT_FOR_LOCAL_PREVIEW / TENANT_METADATA_PRESENT

CALLBACK_URI =
ABSENT_FOR_PORT_3001_PREVIEW

AZURE_AD_LOGIN =
BLOCKED_LOCAL_PROVIDER_CONFIGURATION_ABSENT

AUTH_CALLBACK_RESULT =
PASS_SAME_PORT_AFTER_LOCAL_NEXTAUTH_URL_PREVIOUSLY_PROVEN / AZURE_CALLBACK_NOT_CERTIFIED

PIPELINE_AUTHENTICATED_RENDER =
NOT_CERTIFIED

PIPELINE_API_AUTHENTICATED =
NOT_CERTIFIED

PIPELINE_DATA_AUTHORITY =
DATAVERSE_BACKED_PUBLISHER_OPERATING_CENTER_SNAPSHOT_AND_CANONICAL_LIFECYCLE_READ_MODEL

PIPELINE_16_STAGE_RENDER =
PASS_BY_STATIC_GUARD / AUTHENTICATED_RENDER_NOT_CERTIFIED

TITLE_RECONCILIATION =
PASS_BY_STATIC_GUARD / AUTHENTICATED_RUNTIME_NOT_CERTIFIED

OPERATING_CENTER_AUTHENTICATED_REGRESSION =
NOT_CERTIFIED

SECRET_HYGIENE =
PASS

TYPE_CHECK =
PASS

LINT =
PASS_WITH_EXISTING_FONT_WARNING

WORKFLOW_ENGINE_GUARD =
PASS

16_STAGE_GUARD =
PASS

CAP008_ROUTING =
PASS

BUILD =
PASS_WITH_EXISTING_WARNINGS

FILES_CHANGED =
1

COMMIT =
PENDING_AT_RECORD_CREATION

READY_FOR_DEPLOYMENT_AUTHORIZATION =
NO
