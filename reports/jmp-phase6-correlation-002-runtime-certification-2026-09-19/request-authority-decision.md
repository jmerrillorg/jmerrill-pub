# Request Authority Decision

`REQUEST_AUTHORITY_MODEL = ENTRA CALLER TOKEN + SERVER-SIDE CORRELATION`

Entra issues and expires the workload token. Dataverse validates the token, maps it to the dedicated JM1-Test application user, and enforces the Custom API execute privilege. The plug-in then requires the exact configured application-user ID and validates the engagement, author, title, and lifecycle tuple against durable server-side records. Expected-version checks and idempotency keys control stale state and replay.

No custom HMAC, asymmetric request-signature envelope, signed action token, nonce, or second secret is needed. Payload tampering is handled by server-side re-resolution of every authorization identifier; invalid and expired bearer tokens are rejected before execution.

`SIGNED_REQUEST_CONTRACT_VERSION = NOT_APPLICABLE`.
