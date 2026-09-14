# Workspace / Portal Entitlement Readback

Last Verified: 2026-08-21T23:59:00-04:00
Evidence Source: Live Dataverse Opportunity readback; Azure App Service app settings; Key Vault-backed AUTHOR_PORTAL_ACCESS_REGISTRY_JSON readback; production portal HTTP readback.

## Before Repair

| Check | Result |
| --- | --- |
| Opportunity author portal status | ACTIVE |
| Workspace operational state | ACTIVE |
| Key Vault registry entries | 3 before attempted append / 4 after append |
| Atta matching entitlement grants | 0 |
| Root symptom | Workspace active flag existed, but no author-specific portal grant existed. |

## Repair Readback

| Check | Result |
| --- | --- |
| Registry source | Key Vault-backed app setting AUTHOR_PORTAL_ACCESS_REGISTRY_JSON |
| Parsed grants after repair | 4 |
| Atta matching grants | 1 |
| Atta entitlement state | INVITATION_PENDING |
| Entitlement active | TRUE |
| System attention required | FALSE |
| Cross-author test | ERROR / no entitlement / 0 matching grants |
| Production portal URL | HTTP 200 |
| App service restart | COMPLETED to refresh Key Vault reference |

## Interpretation

Atta now has exactly one scoped active portal entitlement. The grant is not yet bound to an external Microsoft identity, so the honest access state is INVITATION_PENDING rather than signed-in ACTIVE.
