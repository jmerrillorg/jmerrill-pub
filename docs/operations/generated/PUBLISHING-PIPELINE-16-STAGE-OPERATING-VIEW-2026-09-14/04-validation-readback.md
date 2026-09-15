# Validation Readback

## Commands

TYPE_CHECK =
PASS

LINT =
PASS_WITH_EXISTING_FONT_WARNING

WORKFLOW_ENGINE_GUARD =
PASS

PUBLISHER_PIPELINE_16_STAGE_GUARD =
PASS

PUBLISHER_ROUTING_PRECEDENCE_GUARD =
PASS

BUILD =
PASS_WITH_EXISTING_FONT_WARNING

LOCAL_ROUTE_HEAD =
PASS_200

LOCAL_API_UNAUTHENTICATED_HEAD =
PASS_401

AUTH_PREVIEW_PORT =
3001

AUTH_CALLBACK_RESULT =
PASS_SAME_PORT_AFTER_LOCAL_NEXTAUTH_URL

AZURE_AD_LOGIN =
BLOCKED_LOCAL_PROVIDER_CONFIGURATION_ABSENT

AUTH_SECRET =
MISSING_IN_LOCAL_PREVIEW_ENV

PIPELINE_AUTHENTICATED_RENDER =
NOT_CERTIFIED

PIPELINE_API_AUTHENTICATED =
NOT_CERTIFIED

## Guard Coverage

The dedicated guard verifies:

- exactly 16 human-facing stages
- correct stage ordering
- 00 Template is absent
- Pipeline uses the Operating Center snapshot
- Pipeline does not create a local browser lifecycle store
- ambiguous state is surfaced for reconciliation
- Pipeline and Operating Center link to each other

## Runtime Caveat

The package declares Node >=24 <25 and npm >=11 <12. The available local shell was Node v22.23.1 and npm 10.9.8. Dependency installation completed with an engine warning, and the validation gates above passed under the available runtime.

## Auth Preview Caveat

The local preview was corrected to use localhost:3001 for NextAuth callback generation. Azure AD authenticated rendering could not be certified because the local environment does not expose a configured publisher OAuth provider, and the generic author Azure provider is now intentionally hidden unless its required client, secret, and tenant settings are present.

After production build artifacts existed, the local runtime failed closed without AUTH_SECRET. Deployment authorization therefore requires configured production AUTH_SECRET plus configured publisher/Azure OAuth settings before authenticated preview certification can pass.
