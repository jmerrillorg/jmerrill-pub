# SWA Credential Hygiene Assessment

Generated: 2026-08-01

Mode: safe metadata only. No secret values were printed, preserved, committed, or compared.

## Retirement Verification

| Control | Result |
| --- | --- |
| Azure SWA resources named jmerrill-pub | 0 |
| Deleted SWA default hostname | 404 |
| GitHub SWA workflow in current source | 0 |
| GitHub SWA deployment-token secrets | 0 matching names |
| Required checks referencing SWA | 0 |
| Publishing App Service workflow | ACTIVE (Publishing App Service CI/CD) |
| App Service production health | READY, release 846f1050000c24dbc5857adecb19e70c56698099 |

## Credential Inventory

| Setting name | Credential class | Current authoritative storage location | Still referenced by live workload | Rotation capability | Rotation required | Validation owner | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| NODE_ENV | Non-secret runtime configuration | App Service app setting | Yes | N/A | No | Publishing App Service operator | NON_SECRET_CONFIGURATION |
| NEXTAUTH_URL | Non-secret URL configuration | App Service slot setting | Yes | N/A | No | Publishing App Service operator | NON_SECRET_CONFIGURATION |
| DATAVERSE_RESOURCE_URL / WEB_API_BASE_URL / ENVIRONMENT_URL | Non-secret Dataverse endpoint configuration | App Service app settings | Yes | N/A | No | Dataverse platform owner | NON_SECRET_CONFIGURATION |
| JOIN_WORKSPACE_* | Non-secret SharePoint workspace routing configuration | App Service app settings | Yes | N/A | No | Publishing workspace owner | NON_SECRET_CONFIGURATION |
| INTAKE_* configuration | Non-secret intake routing/rate/deadletter configuration | App Service app settings | Yes | N/A | No | Publishing intake owner | NON_SECRET_CONFIGURATION |
| JM1_STRIPE_MODE / JM1_STRIPE_CONNECT_ENABLED / JM1_STRIPE_COMMISSIONING_PAYMENT_ENABLED | Non-secret Stripe/gate configuration | App Service app settings | Yes | N/A | No | Publishing financial governance | NON_SECRET_CONFIGURATION |
| APPLICATIONINSIGHTS_CONNECTION_STRING | Telemetry instrumentation connection metadata | App Service app setting | Yes | Can regenerate through Azure Monitor if required | No | Azure monitoring owner | ACTIVE_BUT_NOT_EXPOSED |
| AUTHOR_PORTAL_ACCESS_REGISTRY_JSON | Protected author access registry | Key Vault reference from App Service | Yes | Can rotate/replace registry entries through governed author-access process | No immediate rotation; review when author access changes | Author access owner | ACTIVE_BUT_NOT_EXPOSED |
| AUTHOR_PORTAL_MASTER_ACCESS_CODE | Protected legacy/master access code | Key Vault reference from App Service | Potentially live as fallback-controlled secret | Can retire/rotate only after confirming no active dependency | Dependency review required before rotation | Author access owner | DEPENDENCY_REVIEW_REQUIRED |
| AUTH_SECRET / NEXTAUTH_SECRET / AUTHOR_PORTAL_SESSION_SECRET | Shared server/session signing secrets | Key Vault references from App Service | Yes | Can rotate only with session invalidation and deployment validation | No immediate rotation; complete dependency map required | Authentication owner | DEPENDENCY_REVIEW_REQUIRED |
| DATAVERSE_TENANT_ID / CLIENT_ID / CLIENT_SECRET | Dataverse application credential set | Key Vault references from App Service and governed vault | Yes | Client secret can rotate only with app registration and workload validation | No rotation authorized without dependency map | Dataverse platform owner | DEPENDENCY_REVIEW_REQUIRED |
| SHAREPOINT_TENANT_ID / CLIENT_ID / CLIENT_SECRET | Microsoft Graph / SharePoint application credential set | Key Vault references from App Service and governed vault | Yes | Client secret can rotate only with Graph/SharePoint workload validation | No rotation authorized without dependency map | SharePoint/Graph owner | DEPENDENCY_REVIEW_REQUIRED |
| TURNSTILE_SITE_KEY / NEXT_PUBLIC_TURNSTILE_SITE_KEY | Public Turnstile widget identifier | Key Vault reference but public by design | Yes | Can rotate by Cloudflare widget replacement | No | Publishing intake owner | NON_SECRET_CONFIGURATION |
| TURNSTILE_SECRET_KEY | Cloudflare Turnstile server secret | Key Vault reference from App Service | Yes | Can rotate in Cloudflare and Key Vault with /join validation | Not required by metadata; rotate only if Jackie requests | Publishing intake owner | ACTIVE_BUT_NOT_EXPOSED |
| AZURE_STORAGE_CONNECTION_STRING | Azure Storage connection string for intake/deadletter recovery | Key Vault reference from App Service | Yes | Can rotate only with queue/recovery validation | No rotation authorized without complete dependency map | Azure storage owner | DEPENDENCY_REVIEW_REQUIRED |
| JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL | Relay endpoint configuration | Key Vault reference from App Service | Yes | N/A for URL | No | Notification owner | NON_SECRET_CONFIGURATION |
| JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY | Internal notification relay key | Key Vault reference from App Service | Yes | Can rotate with relay and intake validation | Not required by metadata; rotate only with dependency map | Notification owner | ACTIVE_BUT_NOT_EXPOSED |
| STRIPE_CONNECT_SECRET_KEY / CHECKOUT_SECRET_KEY / WEBHOOK_SECRET | Stripe production credentials and webhook secret | Key Vault references from App Service | Yes | Rotatable through Stripe dashboard and Key Vault with webhook/payment validation | No rotation authorized by this assessment | Financial governance owner | DEPENDENCY_REVIEW_REQUIRED |
| JM1_ORCHESTRATION_WORKER_KEY / JM1_DIAGNOSTIC_RUNNER_KEY | Worker authentication keys | Key Vault references from App Service | Yes | Can rotate with worker/runner coordination and replay validation | Not required by metadata; rotate only with dependency map | Publishing automation owner | ACTIVE_BUT_NOT_EXPOSED |
| AUTHOR/PUBLISHER OPERATING CENTER CLIENT_ID / TENANT_ID | Non-secret Entra configuration | App Service app settings | Yes | N/A | No | Identity owner | NON_SECRET_CONFIGURATION |
| AUTHOR/PUBLISHER OPERATING CENTER CLIENT_SECRET | Entra app client secrets | Key Vault references from App Service | Yes | Can rotate with Entra app and auth validation | No rotation authorized without auth regression plan | Identity owner | DEPENDENCY_REVIEW_REQUIRED |
| AZURE_STATIC_WEB_APPS_API_TOKEN* | Deleted SWA deployment tokens | GitHub repository Actions secrets, now deleted | No | Deleted/reissue by Azure SWA if recreated | No - obsolete source deleted | Repository owner | EXPIRED_OR_DELETED |

## Rotation Decision

Active credentials requiring immediate rotation: 0.

Rationale: the obsolete SWA configuration source was deleted, GitHub SWA token secrets were deleted, current sensitive App Service settings are Key Vault-backed, and no evidence shows retained values in source, PR text, generated reports, or screenshots. Several shared production secrets remain active and dependency-sensitive; they are classified as DEPENDENCY_REVIEW_REQUIRED or ACTIVE_BUT_NOT_EXPOSED rather than rotated under this narrow authority.

Final event disposition: Contained terminal-output event. No retained value. Obsolete configuration source deleted. No rotation required.
