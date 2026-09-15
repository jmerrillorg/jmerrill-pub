# Microsoft-Native Local Auth Commissioning

Generated: 2026-09-15 EDT

## Work package

JMP-PIPELINE-AUTH-001 - Microsoft-native local authentication commissioning and runtime certification.

## Auth implementation inspection

- AUTH_LIBRARY = `next-auth` `4.24.14`
- AUTH_PROVIDER = `next-auth/providers/azure-ad`
- NEXT_RUNTIME = `next` `16.3.5`
- LOCAL_AUTH_MODEL = CONFIDENTIAL_CLIENT_OAUTH
- CLIENT_SECRET_TECHNICALLY_REQUIRED = YES

Findings:

- The installed Azure AD provider delegates `client_secret` during OAuth token exchange.
- `buildPublisherIdentityProvider()` requires `PUBLISHER_OPERATING_CENTER_CLIENT_ID`, `PUBLISHER_OPERATING_CENTER_CLIENT_SECRET`, and `PUBLISHER_OPERATING_CENTER_TENANT_ID`; if any are absent, the Publisher provider is not initialized.
- Secretless/public-client PKCE was not used because the current source path is a server-side confidential-client NextAuth v4 provider configuration.

## Entra authority and credential action

- IDENTITY_AUTHORITY = MICROSOFT_ENTRA
- APP_REGISTRATION = `JM1 Publisher Operating Center`
- CLIENT_ID = `7bd27a68-fda7-4330-9198-d493f2a0a5ef`
- TENANT_ID = `352d075e-8e17-4169-9f8e-22e6946ce66d`
- CALLBACK = `http://localhost:3001/api/auth/callback/jm1-publisher-operating-center`
- NEW_ENTRA_CREDENTIAL_CREATED = YES
- CREDENTIAL_PURPOSE = PUBLISHER_LOCAL_DEVELOPMENT_AUTH
- CREDENTIAL_DISPLAY_NAME = `PUBLISHER_LOCAL_DEVELOPMENT_AUTH_2026-09-15`
- CREDENTIAL_KEY_ID = `dfe7b74f-ee84-484d-b58d-126dd7db0022`
- CREDENTIAL_START = `2026-09-15T10:39:38Z`
- CREDENTIAL_EXPIRATION = `2026-12-14T23:59:59Z`

Boundaries preserved:

- PRODUCTION_CREDENTIALS_REPLACED = NO
- PRODUCTION_CREDENTIALS_DELETED = NO
- APP_PERMISSIONS_BROADENED = NO
- PRODUCTION_DEPLOYMENT = NO

## Secret custody

- SECRET_CUSTODY = 1PASSWORD_PRIVATE_VAULT
- 1PASSWORD_CLI = NOT_AVAILABLE_ON_PATH
- 1PASSWORD_DESKTOP = AVAILABLE
- ENTRA_SECRET_ITEM_CREATED = YES
- ENTRA_SECRET_ITEM_TITLE = `JM1 Publisher Operating Center - PUBLISHER_LOCAL_DEVELOPMENT_AUTH - 2026-09-15`
- AUTH_SECRET = COMMISSIONED
- AUTH_SECRET_ITEM_CREATED = YES
- AUTH_SECRET_ITEM_TITLE = `JM1 Publisher Operating Center - Local AUTH_SECRET - 2026-09-15`
- `.env.local` = CONFIGURED_FOR_LOCAL_ONLY
- `.env.local` file mode = `600`
- `.env.local` committed = NO

Secret hygiene:

- SECRET_VALUES_IN_EVIDENCE = 0
- SECRET_VALUES_IN_GIT_DIFF = 0
- SECRET_VALUES_PRINTED = 0
- HUMAN_LOGIN_PASSWORD_REUSED = NO
- HUMAN_LOGIN_PASSWORD_COPIED_TO_RUNTIME = NO

## Local runtime certification

- LOCAL_URL = `http://localhost:3001`
- CALLBACK = `http://localhost:3001/api/auth/callback/jm1-publisher-operating-center`
- SERVER_START = PASS
- AUTH_PROVIDER_INITIALIZATION = PASS
- ENTRA_LOGIN = PASS
- AUTH_CALLBACK = PASS
- SESSION = PASS
- SESSION_EMAIL = `jm1-admin@jmerrill.one`
- PIPELINE_AUTHENTICATED_RENDER = PASS
- PIPELINE_API_AUTHENTICATED = PASS
- OPERATING_CENTER_AUTHENTICATED_REGRESSION = PASS
- ANONYMOUS_ACCESS_DENIAL = PASS

Observed authenticated route readback:

- `/api/auth/providers` returned `jm1-publisher-operating-center`
- `/api/auth/callback/jm1-publisher-operating-center` returned through the expected callback path
- `/publisher/pipeline` rendered signed in as `jm1-admin@jmerrill.one`
- `/api/publisher/pipeline` returned `200` under the authenticated browser session
- `/publisher/operating-center` rendered signed in as `jm1-admin@jmerrill.one`

## Data/runtime scope

Production data runtime is managed-identity based. The local workstation does not have an App Service managed identity endpoint, and no Dataverse client secret was created or copied as part of this auth commissioning action.

- DATA_RUNTIME_AUTH_MODEL_LOCAL = NOT_COMMISSIONED
- DATAVERSE_MANAGED_IDENTITY_LOCAL_ENDPOINT = NOT_PRESENT
- DATAVERSE_CLIENT_SECRET_CREATED_OR_COPIED = NO
- PIPELINE_STAGE_COUNT = 16
- TOTAL_TITLES = 0_LOCAL_CORE_UNAVAILABLE
- PLACED_TITLES = 0_LOCAL_CORE_UNAVAILABLE
- UNPLACED_TITLES = 0_LOCAL_CORE_UNAVAILABLE
- AMBIGUOUS_TITLES = 0_LOCAL_CORE_UNAVAILABLE
- DUPLICATE_PROJECTIONS = 0_LOCAL_CORE_UNAVAILABLE

Interpretation:

- Local Publisher authentication is commissioned.
- The 16-stage pipeline shell and route/session gates are certified locally.
- Live title-count reconciliation remains a production-managed-identity or separately governed local Dataverse-runtime certification item.

## Regression readback

- TYPE_CHECK = PASS
- WORKFLOW_ENGINE_GUARD = PASS
- 16_STAGE_GUARD = PASS
- CAP008_ROUTING = PASS
- AUTHOR_AUTH_GUARD = PASS
- PROVIDER_AUTH_GUARD = PASS
- RELEVANT_AZURE_FUNCTION_TESTS = PASS
- LINT = PASS_WITH_EXISTING_FONT_WARNING
- BUILD = PASS_WITH_EXISTING_WARNINGS
- SECRET_HYGIENE = PASS
- GIT_DIFF_CHECK = PASS

Known existing warnings:

- `app/layout.tsx` custom font warning.
- Next.js middleware convention deprecation.
- Edge runtime deprecation.
- Broad dynamic file-pattern warnings under `lib/program003/editorial-command.ts` and `lib/server/publisher-operating-center.ts`.

## Classification

JMP_PIPELINE_AUTH_001_STATUS =
JMP_PIPELINE_AUTH_001_PASS_WITH_LOCAL_TOOLING_FOLLOWUP

READY_FOR_DEPLOYMENT_AUTHORIZATION =
NO

Reason:

Authentication commissioning is complete locally, but deployment authorization should wait for a final production-managed-identity data readback decision and any desired cleanup/retirement decision for the local development credential.

NEXT_ACTION =
Founder decision: authorize production deployment review for PR #737, or separately commission a governed local Dataverse-runtime path for live title-count reconciliation before deployment review.
