# JMP-AUTH-003 Managed Identity Runtime Implementation

Generated: 2026-09-14 09:39:01 EDT

## Classification

JMP_AUTH_003_IMPLEMENTATION_PASS_CANARY_PENDING

## Repository Baseline

- Repository: jmerrill-pub
- Branch: codex/jmp-auth-003-managed-identity-runtime
- Actual implementation baseline: origin/main @ 151f9650822ba95811d21f8a2e6f84abcc50ebc9
- Handoff-stated JM1-OPS reference: d6d30c14d16be85a3f32663c6f6729074d86a5cd

The implementation worktree was created cleanly from current origin/main. The original dirty workspace was not reset, cleaned, or used as source authority.

## Scope Completed

- Added a shared Publisher runtime auth selector for Dataverse and Graph/SharePoint runtime tokens.
- Implemented `MANAGED_IDENTITY` token acquisition using App Service managed identity endpoints.
- Preserved `LEGACY_CLIENT_CREDENTIAL` as the default explicit rollback mode.
- Rewired production web Dataverse helpers to acquire tokens through the shared selector.
- Rewired Graph/SharePoint file runtime callers to acquire tokens through the shared selector.
- Updated health readback so managed identity mode does not require legacy client secrets.
- Added a focused repository guard: `npm run jmp-auth-003-managed-identity-runtime-guard`.

## Scope Not Performed

- No production deployment was performed.
- No production cutover to managed identity mode was performed.
- No client secrets were removed or retired.
- No Dataverse, Graph, SharePoint, mail, or publishing lifecycle authority was broadened.
- No historical Publisher app was deleted.
- No GitHub OIDC deployer workflow was changed.

## Canary Status

The code path is implemented and locally proven. Live production managed-identity canary remains pending because this run did not deploy or change production app settings.
