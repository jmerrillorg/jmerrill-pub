# Security Validation

## Secret Handling

- No secret values were printed in this package.
- No Account Link URLs, author access codes, raw cookies, session secrets, or credential-bearing values were stored in this package.
- AUTHOR_PORTAL_SESSION_SECRET remained Key Vault-backed.
- Publishing runtime secrets remained governed through jm1-core-vault where appropriate.

## Managed Identity

- System-assigned managed identity is enabled on app-jm1-pub-prod.
- Principal ID: 3b468411-65a4-4371-84bd-921acb133fb5
- Tenant ID: 352d075e-8e17-4169-9f8e-22e6946ce66d

## Transport

- HTTPS only: enabled
- Minimum TLS: 1.2
- HTTP/2: enabled
- FTPS: disabled
- Managed certificates are bound with SNI for jmerrill.pub and www.jmerrill.pub.

## Author Portal Fail-Closed

Production unauthenticated author context:

- /api/author/context: 401

Former-fallback rejection remained within the certified PR #337 runtime matrix and was not altered during GATE-W1. No production access code or live author identity was used.

Staging certification-only synthetic test:

- Temporary staging-only synthetic author access settings were applied without real author credentials or manuscript content.
- /api/author/gate returned 401 and issued no cookie.
- /api/author/context without a valid cookie returned 401.
- /api/author/logout returned 200 and emitted a clearing Set-Cookie header.
- Key Vault-backed staging author settings were restored after the test.
- Readback confirmed AUTHOR_PORTAL_ACCESS_REGISTRY_JSON, AUTHOR_PORTAL_MASTER_ACCESS_CODE, AUTHOR_PORTAL_ACCESS_CODE_PEPPER, and AUTHOR_PORTAL_SESSION_SECRET were again Key Vault references.

## Intake Fail-Closed

Production publishing intake invalid Turnstile request:

- Endpoint: /api/publishing/intake
- Result: 400
- Code: turnstile_verification_failed
- Reference emitted: no

## Open Security-Relevant Exception

Native staging Author Operating Center session issuance through /api/author/gate did not accept temporary synthetic access settings. The route failed closed with 401 and no cookie issuance. This is safe, but it prevents reference certification until a governed synthetic issuance path is proven.
