# JM1-INFRA-006 App Service Migration Program Package

Status: Foundation Ready - awaiting Azure resource authorization  
Date: 2026-07-27  
Application: `jmerrill.pub`  
Starting production SHA: `5f4b9a974b3d2556b66eb3eba3478871207b56c2`

## Executive Decision

JM1-INFRA-006 is ready to move from Planning to Foundation Ready.

GO / NO-GO:

| Area | Assessment |
| --- | --- |
| Foundation design | GO |
| IaC readiness | GO |
| Configuration inventory | GO |
| Runtime health architecture | GO |
| Azure resource creation | NO-GO until Jackie authorizes |
| Production migration | NO-GO |
| DNS cutover | NO-GO |
| Static Web Apps retirement | NO-GO |

Final state:

```text
JM1-INFRA-006
FOUNDATION READY
Awaiting Azure Resource Authorization
```

## Phase 1 - Enterprise Foundation Design

### Azure Subscription Layout

| Item | Decision |
| --- | --- |
| Subscription | `JM1 - Nonprofit Core (2025 Grant)` |
| Subscription ID | `9ee13245-2303-4010-8b6d-35f7cbcfdc0e` |
| Tenant | `352d075e-8e17-4169-9f8e-22e6946ce66d` |
| Production RG | `rg-jm1-pub-prod-appsvc` |
| Existing SWA RG | `jmerrill-pub` |
| Ownership | J Merrill One; operator `jm1-admin@jmerrill.one` for governed provisioning |
| RBAC boundary | App Service managed identity gets Key Vault secret get/list only for approved secrets; Graph/Dataverse app permissions remain separate |
| Tags | `program=JM1-INFRA-006`, `system=jmerrill-pub`, `owner=J Merrill One`, `environment=prod`, `managedBy=bicep` |

### Production Naming

| Resource | Name |
| --- | --- |
| Resource group | `rg-jm1-pub-prod-appsvc` |
| App Service Plan | `asp-jm1-pub-prod-linux` |
| Publishing Web App | `app-jm1-pub-prod` |
| Publishing staging slot | `app-jm1-pub-prod/staging` |
| Application Insights | `appi-jm1-pub-prod` |
| Managed Identity | system-assigned identity on app and staging slot |
| Diagnostic settings | `diag-jm1-pub-prod`, `diag-jm1-pub-prod-staging` |
| Key Vault references | existing governed vault, preferred `jm1-core-vault` unless a production-specific vault is authorized |

### Region

| Decision | Rationale |
| --- | --- |
| Production region: Central US | Current SWA is Central US; minimizes migration variance and keeps first App Service deployment near existing runtime behavior. |
| DR: IaC-rebuildable East US 2 standby plan | Phase 1 does not justify active-active cost; Bicep and Key Vault reference model support future regional recreation. |
| Future expansion | Add second App Service Plan and Front Door only after traffic, availability, or compliance requirements justify. |

### App Service Plan

| Recommendation | SKU | Instances | Autoscale | Staging slot | Estimated monthly compute |
| --- | --- | ---: | --- | --- | ---: |
| Best Value | Linux S1 | 1 | manual scale initially | yes | about `$69.35` |
| Balanced | Linux P1v3 | 1 | scale 1-2 on CPU/memory/request pressure | yes | about `$124.10` |
| High Availability | Linux P1v3 | 2 | scale 2-3 during campaigns | yes | about `$248.20` |

Current SWA:

| Item | Value |
| --- | --- |
| Resource | `jmerrill-pub` |
| SKU | Free |
| Compute cost | `$0/month` at active tier |
| Limitation | limited runtime controls, weak slot/cutover control, constrained server/runtime observability |

Cost assumptions use 730 hours/month and Azure Retail Prices API Central US Linux rates observed 2026-07-27: S1 `$0.095/hour`, P1v3 `$0.17/hour`.

## Phase 2 - Runtime Configuration Inventory

Current production SWA app setting names were inventoried without values. Classification:

| Setting | Class | Key Vault | Environment | Disposition |
| --- | --- | --- | --- | --- |
| `AUTHOR_ONBOARDING_ACCESS_CODE` | Secret | yes | prod/staging-specific | staging safe with synthetic value |
| `AUTHOR_PORTAL_ACCESS_CODE_PEPPER` | Secret | yes | prod/staging-specific | required |
| `AUTHOR_PORTAL_ACCESS_RECORDS_JSON` | Secret | yes | prod/staging-specific | superseded by registry where possible |
| `AUTHOR_PORTAL_ACCESS_REGISTRY_JSON` | Secret | yes | prod/staging-specific | required |
| `AUTHOR_PORTAL_MASTER_ACCESS_CODE` | Secret | yes | prod/staging-specific | production only |
| `AUTHOR_PORTAL_SESSION_SECRET` | Secret | yes | prod/staging-specific | required; former fallback rejected |
| `AUTH_SECRET` | Secret | yes | prod/staging-specific | required if NextAuth active |
| `NEXTAUTH_URL` | Non-secret | no | slot-specific | required |
| `AUTHOR_OPERATING_CENTER_CLIENT_ID` | Non-secret | candidate | environment-specific | required if durable auth active |
| `AUTHOR_OPERATING_CENTER_CLIENT_SECRET` | Secret | yes | environment-specific | required if durable auth active |
| `AUTHOR_OPERATING_CENTER_TENANT_ID` | Non-secret | candidate | environment-specific | required |
| `AUTHOR_OPERATING_CENTER_AUTH_MODE` | Non-secret | no | environment-specific | required |
| `AUTHOR_OPERATING_CENTER_ISSUER` | Non-secret | no | environment-specific | required |
| `PUBLISHER_OPERATING_CENTER_CLIENT_ID` | Non-secret | candidate | environment-specific | required if publisher auth active |
| `PUBLISHER_OPERATING_CENTER_CLIENT_SECRET` | Secret | yes | environment-specific | required if publisher auth active |
| `PUBLISHER_OPERATING_CENTER_TENANT_ID` | Non-secret | candidate | environment-specific | required |
| `PUBLISHER_OPERATING_CENTER_ALLOWED_EMAILS` | Non-secret sensitive | yes/candidate | production only | required |
| `PUBLISHER_OPERATING_CENTER_ALLOWED_OBJECT_IDS` | Non-secret sensitive | yes/candidate | production only | required |
| `DATAVERSE_TENANT_ID` | Non-secret | candidate | shared | required |
| `DATAVERSE_CLIENT_ID` | Non-secret | candidate | shared | required |
| `DATAVERSE_CLIENT_SECRET` | Secret | yes | shared/prod | required |
| `DATAVERSE_ENVIRONMENT_URL` | Non-secret | no | shared/prod | required |
| `DATAVERSE_RESOURCE_URL` | Non-secret | no | shared/prod | required |
| `DATAVERSE_WEB_API_BASE_URL` | Non-secret | no | shared/prod | required |
| `DATAVERSE_PUBLISHING_INTAKE_ENTITY_SET` | Non-secret | no | shared/prod | required |
| `SHAREPOINT_TENANT_ID` | Non-secret | candidate | shared | required |
| `SHAREPOINT_CLIENT_ID` | Non-secret | candidate | shared | required |
| `SHAREPOINT_CLIENT_SECRET` | Secret | yes | shared/prod | required |
| `GRAPH_TENANT_ID` | Non-secret | candidate | shared | possibly redundant with SharePoint tenant |
| `GRAPH_CLIENT_ID` | Non-secret | candidate | shared | migration required if code path active |
| `GRAPH_CLIENT_SECRET` | Secret | yes | shared/prod | migration required if code path active |
| `JOIN_WORKSPACE_INQUIRY_ROOT` | Non-secret | no | shared/prod | required |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public | no | environment-specific | required client value |
| `TURNSTILE_SITE_KEY` | Non-secret | candidate | environment-specific | required server/config |
| `TURNSTILE_SECRET_KEY` | Secret | yes | environment-specific | required |
| `INTAKE_ALLOWED_ORIGINS` | Non-secret | no | slot-specific | required |
| `INTAKE_RATE_LIMIT_ENABLED` | Non-secret | no | shared/prod | required |
| `FORM_NOTIFICATION_TO` | Non-secret | no | production only | legacy/current notification |
| `POWER_AUTOMATE_JOIN_URL` | Secret URL | yes | production only | migration required if route active |
| `POWER_AUTOMATE_NOTIFICATION_URL` | Secret URL | yes | production only | migration required if route active |
| `POWER_AUTOMATE_AUTHOR_ONBOARDING_URL` | Secret URL | yes | production only | migration required if route active |
| `JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL` | Secret URL | yes | shared/prod | required |
| `JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY` | Secret | yes | shared/prod | required |
| `JM1_ORCHESTRATION_WORKER_KEY` | Secret | yes | production only | required for orchestration routes |
| `STRIPE_CONNECT_SECRET_KEY` | Secret | yes | environment-specific | required for enrollment only |
| `STRIPE_CHECKOUT_SECRET_KEY` | Secret | yes | environment-specific | payment execution gated |
| `STRIPE_WEBHOOK_SECRET` | Secret | yes | environment-specific | required if webhook active |
| `JM1_STRIPE_MODE` | Non-secret | no | environment-specific | required |
| `JM1_STRIPE_CONNECT_ENABLED` | Non-secret | no | environment-specific | required |
| `JM1_STRIPE_COMMISSIONING_PAYMENT_ENABLED` | Non-secret feature gate | no | production only | must remain `false` |
| `JM1_STRIPE_COMMISSIONING_AUTHOR_EMAIL` | Non-secret sensitive | candidate | production only | pilot support |
| `JM1_STRIPE_COMMISSIONING_OPPORTUNITY_ID` | Non-secret sensitive | candidate | production only | pilot support |
| `PROGRAM003_PILOT_ASSET_ID` | Non-secret sensitive | candidate | production only | required if pilot artifact route active |
| `NPM_INSTALL_FLAGS` | Non-secret | no | build only | obsolete for App Service runtime |

Settings used by source but not currently present in SWA must be reviewed before App Service production migration:

- `APPLICATIONINSIGHTS_CONNECTION_STRING`
- ACS direct settings such as `ACS_CONNECTION_STRING`, `ACS_ENDPOINT`, and sender settings if direct ACS mode is activated
- `AZURE_STORAGE_CONNECTION_STRING` and `INTAKE_DEADLETTER_QUEUE_NAME` for dead-letter queue runtime proof
- Business Central settings once BC production posting is authorized

## Phase 3 - Managed Identity Plan

| Service | Authentication | Recommendation |
| --- | --- | --- |
| Dataverse | Current app registration with client secret | Keep for initial App Service migration; evaluate managed identity/service principal Dataverse access after provisioning. |
| Graph/SharePoint | Current app registration with client secret | Keep least-privilege Graph app initially; prefer Sites.Selected/site-scoped grants. |
| Key Vault | App Service system-assigned managed identity | Required for app and staging slot. |
| ACS | Relay key or ACS connection string through Key Vault | Keep server-only; no browser exposure. |
| Business Central | Not active for website production posting | Design app registration/managed identity separately before any production posting. |
| Storage/dead-letter | Future storage queue | Prefer managed identity and queue data contributor role. |
| Stripe | Restricted server key from Key Vault | Enrollment only; no charge/transfer/payout permission expansion. |

Least privilege:

- App Service MI: Key Vault Secrets User or equivalent `get` only for approved secrets.
- Graph app: site/library-specific read/write required for intake manuscript preservation; avoid tenant-wide Graph grants unless separately approved.
- Dataverse app: table-level least privilege for website runtime tables.
- Stripe: restricted key for Author Payout Enrollment only.

## Phase 4 - Infrastructure as Code

| Item | Value |
| --- | --- |
| Technology | Bicep |
| Location | `infra/jm1-infra-006/app-service/main.bicep` |
| Validation | `az bicep build --file infra/jm1-infra-006/app-service/main.bicep` |
| Deployment | Not authorized in this wave |

Included:

- App Service Plan
- Linux Web App
- staging slot
- system-assigned managed identities
- Application Insights
- `/api/health` health check
- Key Vault reference app settings
- diagnostic settings

## Phase 5 - Deployment Pipeline

Target pipeline:

```text
Build
  -> Deploy to staging
  -> Warm application
  -> Runtime certification
  -> Health window
  -> Operator approval
  -> Slot swap
  -> Observe
  -> Close deployment
```

Rollback:

- preferred: swap back;
- second: redeploy previous package;
- third: DNS/SWA fallback while SWA remains retained;
- never: restore static auth fallback or weaken authorization.

## Phase 6 - Health Architecture

`/api/health` now exists in source.

It reports:

- app startup;
- release identifier;
- config presence;
- Dataverse readiness;
- Graph/SharePoint readiness;
- ACS relay readiness;
- artifact workspace readiness;
- Author Portal session-secret posture;
- Stripe enrollment configuration;
- payment gate state;
- dependency degradation.

It does not expose secrets, token material, raw configuration values, author data, manuscript data, direct SharePoint URLs, or Stripe account/link data.

## Phase 7 - Migration Inventory

| Dependency | Classification | Notes |
| --- | --- | --- |
| custom domains | Migration required | `jmerrill.pub` DNS and certificate binding must move only after cutover authorization. |
| SSL | Migration required | App Service managed certificate or imported certificate required. |
| DNS | Migration required | separate cutover window and rollback TTL plan required. |
| static assets | Already portable | Next.js build assets packaged with app. |
| uploads/manuscripts | Already portable | Stored in SharePoint, not local filesystem. |
| SharePoint | Already portable | Graph credentials and permissions must migrate. |
| Dataverse | Already portable | App settings/secret references must resolve. |
| Graph | Migration required | identity and permissions must be attached to App Service runtime. |
| Stripe | Migration required | Key Vault references and webhook/callback host validation required. |
| ACS/relay | Migration required | relay URL/key or direct ACS settings must be available. |
| Application Insights | Migration required | new workspace-based component needed. |
| Logging | Migration required | App Service diagnostics to Log Analytics. |
| Health probes | Prepared | `/api/health` route added. |
| GitHub Actions | Migration required | separate App Service deployment workflow required; current SWA workflow remains active. |

## Phase 8 - Cost and Operations

Three-year compute estimate:

| Estate posture | Monthly estimate | 3-year estimate | Notes |
| --- | ---: | ---: | --- |
| Current SWA Free | `$0` | `$0` | excludes operational limitations and any future paid SWA tier |
| Publishing Best Value S1 | `$69.35` | `$2,496.60` | initial App Service production target |
| Publishing Balanced P1v3 | `$124.10` | `$4,467.60` | recommended after sustained runtime load |
| Publishing HA P1v3 x2 | `$248.20` | `$8,935.20` | use for higher availability/campaign periods |
| JM1 enterprise growth, 3 apps on S1 | `$208.05` | `$7,489.80` | Publishing, Financial, Foundation each on S1 |
| JM1 enterprise growth, 3 apps on P1v3 | `$372.30` | `$13,402.80` | balanced enterprise posture |

Operational costs to monitor:

- Application Insights ingestion and retention;
- outbound bandwidth;
- Key Vault transactions;
- DNS/certificate costs if non-managed certificates are used;
- future Storage/dead-letter queue;
- higher App Service SKUs during campaigns.

## Phase 9 - Risk Register

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Identity grants too broad | High | use MI for Key Vault and app registrations with least privilege; document Graph/Dataverse permissions |
| secret reference missing | High | staging Key Vault reference validation before swap |
| DNS cutover error | High | low TTL, rollback target retained, cutover window |
| slot setting drift | Medium | mark environment-specific settings as slot-specific |
| rollback path unclear | High | retain SWA until post-cutover acceptance |
| Author Portal auth regression | Critical | fail-closed tests and former-fallback rejection before swap |
| Dataverse permission mismatch | High | staging synthetic intake proof |
| Graph/SharePoint permission mismatch | High | synthetic manuscript preservation proof |
| Stripe payment gate accidentally enabled | Critical | keep `JM1_STRIPE_COMMISSIONING_PAYMENT_ENABLED=false`; health exposes gate state |
| ACS notification failure | Medium | notification proof and recovery path |
| Business Central accidental posting | Critical | no BC production posting in this migration |
| logging leaks private data | High | deployment log scan and app log sampling |
| SWA retired too early | High | SWA retirement separate directive only |

## Phase 10 - Production Readiness Checklist

| Area | Checklist |
| --- | --- |
| Infrastructure | RG, App Service Plan, Web App, slot, App Insights, diagnostics provisioned from IaC |
| Identity | MI principal IDs captured; Key Vault access granted; Graph/Dataverse app permissions confirmed |
| Secrets | Key Vault references resolve; no secret in GitHub logs/source/browser |
| Health | `/api/health` returns acceptable status |
| Monitoring | App Insights live metrics/log queries verified |
| Rollback | slot rollback and SWA fallback confirmed |
| Runtime certification | `/join`, Author Portal, notifications, Stripe gate, and artifact paths tested |
| DNS | certificate binding and TTL rollback plan approved |
| Slots | staging warmed and certified before swap |
| Smoke tests | public pages, APIs, and protected routes verified |
| Acceptance | Jackie approval recorded before production cutover |

## Required Deliverables Matrix

| Deliverable | Location |
| --- | --- |
| Azure topology, naming, SKU, cost | This package and hosting standard |
| Security identity/RBAC/Key Vault | This package and hosting standard |
| Deployment pipeline, slot strategy, rollback | Migration runbook |
| Health endpoint and monitoring design | `/api/health`, this package, runbook |
| Migration inventory, order, risks | This package and runbook |
| IaC | `infra/jm1-infra-006/app-service/main.bicep` |
| Validation | `scripts/infra006_health_contract.test.mjs`, Bicep build |

## Final Assessment

JM1-INFRA-006 Phase 1 is Foundation Ready.

Jackie can now authorize Azure resource creation with the architecture, naming, costs, IaC, health gate, migration order, rollback plan, and risk posture already prepared.

No resource creation, production migration, DNS cutover, Static Web Apps retirement, Stripe action, payout, Business Central posting, secret exposure, or evidence deletion is authorized or performed by this package.
