# Settings-preserving Function source release

This is an optional release mode, not commissioning authority or a worker switch.
Ordinary pushes and standard manual releases retain the existing approved configuration path.
Only a manual main-branch dispatch may choose `release_mode=source-only`.

Prerequisites: exact reviewed main SHA/artifact; the existing ONE serialized shared-Function release slot; protected environment approval; current live health and package/release SHA; no concurrent settings or identity writer. The source-only guard does not replace serialization, least privilege, or human business decisions.

For a source-only dispatch supply `expected_previous_release` as the full verified current live SHA. The guard reads settings without logging their values, validates ready health, identical production/release markers, existing SystemAssigned package identity, and exact private blob package binding. It persists only four non-secret release preimages and an aggregate fingerprint/count of unrelated settings to runner temporary evidence. SAS-bearing or foreign package references are rejected. No keys, tokens or full settings export are written to evidence.

Before activation it rechecks the entire unrelated-settings fingerprint, exact release preimage and live health. Only these fields may be written:

- WEBSITE_RUN_FROM_PACKAGE
- WEBSITE_RUN_FROM_PACKAGE_BLOB_MI_RESOURCE_ID (existing SystemAssigned retained)
- JM1_RELEASE_SHA
- JM1_PRODUCTION_RELEASE_SHA

Commercial, payment, reminder, identity, relay, secret-reference and worker settings retain both values and presence/absence. The existing full health/indexing/no-effect readbacks still run. Final unrelated-settings and release checks precede successful release certification. CLI app-setting updates are not a distributed transaction; explicit serialized ownership remains mandatory. Any observed concurrent drift fails and must be investigated, not overwritten.

On failure the source-only path restores its exact four-field preimage only when the active markers and package still belong to this release and unrelated settings are unchanged. Already-restored state is a no-op. Ambiguous or competing state fails closed for owner readback. It does not blindly restore other settings or substitute the ordinary LAST_KNOWN_GOOD rollback. Restart/health verification must confirm both original release markers. No LocalCreate/security grant is part of this path.

Safe receipts/preimage are included in existing private deployment artifacts. A rollback receipt is uploaded separately after recovery because the ordinary evidence-upload step precedes rollback. Recovery is not proven from tests alone; live source-only preservation/rollback acceptance remains required under the serialized protected release.

Focused validation: `node --test .github/tests/diagnostic-source-only-release.test.mjs`. The new paths participate in Function workflow validation, not website deployment.
