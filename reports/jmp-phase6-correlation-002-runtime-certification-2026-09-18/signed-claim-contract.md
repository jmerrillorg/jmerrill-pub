# Request Authority Contract Readback

Status: NATIVE IDENTITY MODEL SELECTED / DEPLOYMENT PENDING

The deployed and source-controlled Custom API exposes 26 inputs. It has fields for actor, authority context, engagement ID, contact ID, title ID, lifecycle ID, correlation ID, and idempotency key. It has no signature, signed payload, expiration, issued-at time, nonce, key ID, or request digest field.

The plug-in checks only two static strings: `phase6-authorized-actor` and `V2_ONBOARDING_AUTHORITY`. It performs no cryptographic request verification. The configured `JMP_PHASE6_SIGNING_KEY_PATH` is a .NET strong-name assembly-signing input, not an established request-signing contract.

No existing governed request-signing key or canonical payload representation was found. Reusing an assembly strong-name key for request signatures would conflate key purposes and is not authorized. A custom signed envelope is also unnecessary: the actual caller is an isolated Azure managed identity represented by a dedicated Dataverse application user and least-privilege role.

Selected contract:

- Entra-issued Dataverse access token authenticates the workload identity;
- Dataverse maps the token to the dedicated Phase 6 application user;
- `executeprivilegename=prvCreatejmpv2_OnboardingRecord` restricts Custom API execution to the explicit Phase 6 role grant;
- the plug-in validates engagement, author, title, lifecycle, stage, expected version, and idempotency server-side;
- request replay is governed by the existing idempotency and optimistic-version contract.

No `SIGNED_REQUEST_CONTRACT_VERSION` applies because no custom request-signing protocol is selected. Modified/substituted identifiers are denied by the server-side durable relationship checks, while wrong or unauthorized callers are denied by Dataverse token and privilege enforcement.

Remaining deployment prerequisite: make the existing governed assembly strong-name key available through its approved path so the corrected plug-in can be signed and transported.

No key was created, rotated, printed, committed, or placed in evidence.
