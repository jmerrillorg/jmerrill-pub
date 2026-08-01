# Rollback Authority Replacement

## Retired Rollback Authority

Static Web Apps is no longer a rollback platform for Publishing.

## Current Rollback Authority

Rollback authority is:

App Service slot swap-back plus last-known-good immutable artifact.

## Evidence

| Control | Status |
| --- | --- |
| Production slot exists | Pass |
| Staging slot exists | Pass |
| Last production release SHA | `77230c077f37910f75cf7b274734475ac1a92d3e` |
| App Service health endpoint | `/api/health` |
| Immutable artifact workflow | `Publishing App Service CI/CD` |
| Artifact checksum workflow step | Present |
| Production observation and swap-back logic | Present in workflow |
| Rollback owner | Publishing operator / Jackie-governed production approver |

No SWA rollback-retention window remains because the SWA resource was deleted.

