# Authentication and Preview Certification

Generated: 2026-09-14 09:09:31 EDT

## Local Port Authority

AUTH_PREVIEW_PORT =
3001

PORT_3000_OWNER =
NONE

PORT_3001_OWNER =
this worktree Next.js preview process

PORT_3001_WORKTREE =
/Volumes/UsersExternal/Developer/codex-worktrees/jmerrill-pub-publisher-pipeline-16-stage

SOURCE_COMMIT_UNDER_TEST =
2c624a23a3584237ec796f09868df6b5aca56895

CANONICAL_LOCAL_PREVIEW =
http://localhost:3001/publisher/pipeline

## Port Discrepancy

PORT_DISCREPANCY_CAUSE =
NextAuth selected localhost:3000 as the local auth base URL when the preview was running on port 3001 without an explicit NEXTAUTH_URL.

CORRECTION =
Restarting the local preview with NEXTAUTH_URL=http://localhost:3001 made generated callback/sign-in URLs and callback cookies resolve to localhost:3001.

AUTH_CALLBACK_RESULT =
PASS_SAME_PORT_AFTER_LOCAL_NEXTAUTH_URL

AUTH_CALLBACK_COOKIE =
next-auth.callback-url=http://localhost:3001/publisher/pipeline

UNRELATED_PORT_3000_PROCESS =
NO

## Authentication Provider Findings

PUBLISHER_PROVIDER_LOCAL =
ABSENT

AUTHOR_AZURE_PROVIDER_BEFORE_FIX =
VISIBLE_BUT_INVALID

AUTHOR_AZURE_PROVIDER_ERROR =
OAuthSignin / invalid_tenant, caused by missing local Azure client and tenant settings.

AUTHOR_AZURE_PROVIDER_AFTER_FIX =
HIDDEN_WHEN_REQUIRED_SETTINGS_ARE_ABSENT

LOCAL_AUTH_PROVIDERS_AFTER_FIX =
jm1-author-email-otp

AUTH_SECRET_LOCAL =
ABSENT

AUTH_SECRET_EFFECT =
development warns; production-built runtime fails closed until a valid AUTH_SECRET is configured.

AZURE_AD_LOGIN =
BLOCKED_LOCAL_PROVIDER_CONFIGURATION_ABSENT

PIPELINE_AUTHENTICATED_RENDER =
NOT_CERTIFIED

PIPELINE_API_AUTHENTICATED =
NOT_CERTIFIED

READY_FOR_DEPLOYMENT_AUTHORIZATION =
NO

## Source Correction

The publisher sign-in buttons now prefer the publisher-specific OAuth provider when it is configured. If that provider is absent in a local environment, they fall back to the NextAuth provider selection page on the same callback URL instead of silently targeting a missing provider id.

The author Azure provider is no longer registered when required local OAuth settings are absent. This prevents a false Azure option from appearing and failing with an invalid tenant error.

FILES_CHANGED =
8

SOURCE_FILES_CHANGED =
3

EVIDENCE_FILES_CHANGED =
5

- app/publisher/_components/PublisherPipelineClient.tsx
- app/publisher/_components/PublisherOperatingCenterClient.tsx
- lib/server/author-durable-auth.ts

## Certification Boundary

No deployment was performed.

No Dataverse, SharePoint, Azure production resource, email, author record, or title lifecycle state was mutated.

Authenticated Azure Pipeline rendering remains gated on valid local/provider OAuth configuration and a completed operator login.

Deployment authorization remains gated on valid production AUTH_SECRET and publisher/Azure OAuth configuration.
