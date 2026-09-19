# Signed Claim Contract Readback

Status: NOT IMPLEMENTED / AUTHORITY REQUIRED

The deployed and source-controlled Custom API exposes 26 inputs. It has fields for actor, authority context, engagement ID, contact ID, title ID, lifecycle ID, correlation ID, and idempotency key. It has no signature, signed payload, expiration, issued-at time, nonce, key ID, or request digest field.

The plug-in checks only two static strings: `phase6-authorized-actor` and `V2_ONBOARDING_AUTHORITY`. It performs no cryptographic request verification. The configured `JMP_PHASE6_SIGNING_KEY_PATH` is a .NET strong-name assembly-signing input, not an established request-signing contract.

No existing governed request-signing key or canonical payload representation was found. Reusing an assembly strong-name key for request signatures would conflate key purposes and is not authorized. Adding new Custom API claims or inventing an envelope inside an unrelated field would change the authentication contract and is outside the safe bounded correction without explicit authority.

Required closure authority:

- identify the existing governed request-signing authority, if one exists;
- define its canonical payload, algorithm, key identifier, expiration, and nonce/replay contract;
- make the existing Phase 6 assembly strong-name key available through its approved path for deployment;
- authorize the minimal managed solution update needed to transport the corrected assembly and any approved request-contract additions.

No key was created, rotated, printed, committed, or placed in evidence.
