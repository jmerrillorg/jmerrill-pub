# Request Authority Decision

## Decision

`REQUEST_AUTHORITY_MODEL = ENTRA_CALLER_TOKEN + SERVER_SIDE_CORRELATION`

The dedicated Azure Function managed identity authenticates with an Entra-issued Dataverse token. Dataverse maps the token to the dedicated JM1-Test application user and authorizes execution through the narrow Phase 6 role. The Custom API source declares `prvCreatejmpv2_OnboardingRecord` as its execute privilege. The plug-in then verifies all durable business correlations and state server-side.

No custom HMAC, asymmetric request signature, signed action token, key identifier, nonce, or expiration field is added. Token issuance and expiry remain Entra authority; request replay and stale state remain the existing idempotency-key and expected-version authority.

The caller-provided `Actor` and `AuthorityContext` strings remain command-contract checks only. They are not accepted as proof of identity.

`SIGNED_REQUEST_CONTRACT_VERSION = NOT_APPLICABLE`.
