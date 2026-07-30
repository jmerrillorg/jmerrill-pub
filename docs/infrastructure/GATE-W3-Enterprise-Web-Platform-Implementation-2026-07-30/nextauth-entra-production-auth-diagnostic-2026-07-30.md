# NextAuth / Microsoft Entra Production Authentication Diagnostic

Verified: 2026-07-30T14:07:02Z

Scope: jmerrill.pub production App Service authentication path only.

## Initial failure

Publisher sign-in returned `OAuthSignin` before reaching Microsoft Entra ID.

Server log evidence showed `SIGNIN_OAUTH_ERROR` for provider `azure-ad` with Microsoft error `AADSTS90002`, where tenant `v2.0` was being treated as the tenant identifier. This indicated the active production provider configuration was falling back to the wrong provider/environment contract rather than using the governed custom provider IDs.

## Root cause

Production App Service did not have the governed Author Operating Center and Publisher Operating Center NextAuth provider settings loaded at runtime. `/api/auth/providers` exposed only the default `azure-ad` provider before repair.

The prompt-listed `AUTH_MICROSOFT_ENTRA_ID_*` variables are not consumed by the deployed application. The deployed code expects:

- `AUTHOR_OPERATING_CENTER_CLIENT_ID`
- `AUTHOR_OPERATING_CENTER_CLIENT_SECRET`
- `AUTHOR_OPERATING_CENTER_TENANT_ID`
- `AUTHOR_OPERATING_CENTER_AUTH_MODE`
- `AUTHOR_OPERATING_CENTER_ISSUER`
- `PUBLISHER_OPERATING_CENTER_CLIENT_ID`
- `PUBLISHER_OPERATING_CENTER_CLIENT_SECRET`
- `PUBLISHER_OPERATING_CENTER_TENANT_ID`
- `PUBLISHER_OPERATING_CENTER_ALLOWED_EMAILS`
- `PUBLISHER_OPERATING_CENTER_ALLOWED_OBJECT_IDS`
- `NEXTAUTH_URL`
- `AUTH_SECRET`

## Repair

Production App Service `app-jm1-pub-prod` was configured with the existing governed custom provider contract. Client secret values were supplied only through Key Vault references.

No secret values were printed, stored in evidence, source, logs, or terminal output.

## Post-repair validation

`/api/auth/providers` now exposes only:

- `jm1-author-operating-center`
- `jm1-publisher-operating-center`

Publisher sign-in now generates a Microsoft Entra authorization redirect with callback:

`https://jmerrill.pub/api/auth/callback/jm1-publisher-operating-center`

This matches the Microsoft Entra application registration for `JM1 Publisher Operating Center`.

Author sign-in now generates a Microsoft External ID authorization redirect with callback:

`https://jmerrill.pub/api/auth/callback/jm1-author-operating-center`

The browser received Microsoft sign-in pages for both provider flows. Publisher callback completed successfully in the existing approved browser session and reached the authenticated Publisher Operating Center.

The Author Portal loads and the author sign-in route is correctly bound to the custom provider. Existing browser session state showed an authenticated author workspace view; no live credentials or author secrets were handled during this diagnostic.

## Security checks

- Secret values exposed in inspected HTML/logs: No.
- Former fallback-signed Author Portal cookie accepted: No, rejected with `401`.
- Unauthenticated author context: `401`.
- Unauthenticated publisher operating-center API: `401`.

## Remaining limitation

Full fresh author Microsoft credential entry was not performed because no live author credential use was authorized for this diagnostic. The custom provider redirect and existing author portal runtime state were validated without capturing credentials or session material.

