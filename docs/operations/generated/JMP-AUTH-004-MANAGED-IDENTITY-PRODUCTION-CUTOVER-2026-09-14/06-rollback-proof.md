# Rollback Proof

Before cutover, the App Service was explicitly set to legacy client credential mode:

- setting = PUBLISHER_RUNTIME_AUTH_MODE
- value = LEGACY_CLIENT_CREDENTIAL
- set at = 2026-09-14 16:59:31 EDT

Production health after the explicit rollback-mode setting:

- status = ready
- release = 235339ccad0f213e248786ebee2f950bf7ef7a34
- Dataverse runtime auth mode = LEGACY_CLIENT_CREDENTIAL
- Graph/SharePoint runtime auth mode = LEGACY_CLIENT_CREDENTIAL
- required legacy environment settings = present

Rollback capability was proven before managed identity cutover. The legacy client secrets were intentionally retained after cutover so rollback remained available.

ROLLBACK_PROOF = PASS
