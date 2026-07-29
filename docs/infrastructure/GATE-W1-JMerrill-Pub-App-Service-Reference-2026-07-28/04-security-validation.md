# Security Validation

## Secret Handling

- No secret values were printed in this package.
- No Account Link URLs, author access codes, raw cookies, session secrets, or credential-bearing values were stored in this package.
- AUTHOR_PORTAL_SESSION_SECRET remained Key Vault-backed.
- Publishing runtime secrets remained governed through jm1-core-vault where appropriate.
- App-scope publishing profiles for the production app and staging slot were reset after an operator inspection command returned publish-profile credentials during troubleshooting. No publish-profile values were written to source, evidence, PR comments, or retained files.

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

- Key Vault-backed staging author settings remained configured as Key Vault references after the retest.
- `/api/health` returned non-secret author-access diagnostics: `registrySource: env_registry`, `grantCount: 1`, `activeGrantCount: 1`, `pepperConfigured: true`, and `sessionSecretConfigured: true`.
- A safe registry inspection found no synthetic/certification fixture marker in the current active registry.
- Staging `/api/author/gate` was tested with the configured master access secret without printing or retaining the secret. The gate returned 200 and issued `jm1_author_portal_session`.
- `/api/author/context` from the issued cookie returned 200.
- No-cookie `/api/author/context` returned 401.
- A forged fallback-style session attempt returned 401.
- `/api/author/logout` returned 200.
- `/api/author/context` after logout returned 401.

This isolates the current `/api/author/gate` behavior: session issuance, cookie setting, session-secret validation, and logout are functioning in the deployed staging runtime.

Staging synthetic project test:

- Synthetic reference `JMP-INT-202607-YEUSKK` was created through a token-bearing Turnstile `/join` proof.
- `/api/author/gate` with the governed master gate and requested synthetic reference returned 200 and issued `jm1_author_portal_session`.
- The gate response resolved the synthetic author and synthetic project context.
- No-cookie `/api/author/context` returned 401.
- Forged former-fallback session returned 401.
- Missing/cross artifact download returned non-disclosing 404.
- Logout returned 200 and post-logout context returned 401.
- No own-artifact download was proven because the synthetic project has no delivered author-facing editorial artifact backed by Graph content.

## Intake Fail-Closed

Production publishing intake invalid Turnstile request:

- Endpoint: /api/publishing/intake
- Result: 400
- Code: turnstile_verification_failed
- Reference emitted: no

## Security-Relevant Exception

Native staging Author Operating Center session issuance is now proven through the configured master gate, but fresh synthetic fixture authorization and artifact isolation are not yet proven in the current evidence window. The staging run-from-package release passed the explicit 10-probe restart health proof, but the App Service deployment authority and rollback procedure still need clean workflow and rollback evidence before certification.
