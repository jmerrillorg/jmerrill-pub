# Runtime Auth Architecture

## New Shared Module

`lib/server/publisher-runtime-auth.ts`

Exports:

- `getPublisherRuntimeAuthMode`
- `getDataverseRuntimeAccessToken`
- `getGraphSharePointRuntimeAccessToken`
- `getPublisherRuntimeAuthReadback`

## Modes

`PUBLISHER_RUNTIME_AUTH_MODE=LEGACY_CLIENT_CREDENTIAL`

- Default mode.
- Uses existing tenant/client/client-secret settings.
- Preserves current rollback path.

`PUBLISHER_RUNTIME_AUTH_MODE=MANAGED_IDENTITY`

- Uses Azure App Service managed identity metadata endpoints.
- Supports current `IDENTITY_ENDPOINT` / `IDENTITY_HEADER`.
- Supports legacy `MSI_ENDPOINT` / `MSI_SECRET`.
- Supports user-assigned identity selection with `PUBLISHER_MANAGED_IDENTITY_CLIENT_ID`.
- Fails closed if managed identity endpoint/header settings are absent.
- Does not fall back to client secret after a managed identity failure.

## Resource Boundaries

- Dataverse token resource: configured Dataverse resource URL.
- Graph/SharePoint token resource: `https://graph.microsoft.com`.
- Mail authority was not added or expanded.

## Safe Telemetry

The shared module emits only safe metadata:

- authority
- mode
- resource host
- provider type
- success/failure
- safe failure code

It does not emit tokens, secrets, request headers, or credential values.
