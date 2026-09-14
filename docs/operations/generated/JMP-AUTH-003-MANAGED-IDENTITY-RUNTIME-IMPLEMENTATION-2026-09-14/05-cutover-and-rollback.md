# Cutover And Rollback

## Cutover Unit

Set production app setting:

`PUBLISHER_RUNTIME_AUTH_MODE=MANAGED_IDENTITY`

For a user-assigned managed identity, also set:

`PUBLISHER_MANAGED_IDENTITY_CLIENT_ID=e7b7f038-4016-4a3a-93d8-cecd0eda9159`

The production platform must expose either:

- `IDENTITY_ENDPOINT` and `IDENTITY_HEADER`, or
- `MSI_ENDPOINT` and `MSI_SECRET`

## Rollback Unit

Set production app setting:

`PUBLISHER_RUNTIME_AUTH_MODE=LEGACY_CLIENT_CREDENTIAL`

Existing client-secret settings remain in place for rollback. No secret retirement is included in this PR.

## Canary Gate

Before managed-identity cutover is accepted, run production read-only canaries for:

- Dataverse token acquisition and read-only record lookup.
- Graph/SharePoint token acquisition and read-only file metadata/content fetch.

Do not send author communications, mutate records, upload files, or change provider publication state as part of the canary.
