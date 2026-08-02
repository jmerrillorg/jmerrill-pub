# Annex A Read-Only Entitlement Review

Status: PENDING_EVIDENCE
Generated: 2026-08-02

## Authority

Jackie authorized read-only collection of current Microsoft tenant entitlement evidence for Annex A.

No license purchases, role assignments, permission changes, service activations, or Annex A promotion were authorized or performed.

## Tenant Readback

Source: Azure CLI account readback and Microsoft Graph read-only requests.

- Tenant ID: 352d075e-8e17-4169-9f8e-22e6946ce66d
- Subscription: JM1 - Nonprofit Core (2025 Grant)
- Subscription ID: 9ee13245-2303-4010-8b6d-35f7cbcfdc0e
- Administrative identity used: jm1-admin@jmerrill.one
- Evidence timestamp: 2026-08-02

## License and Service-Plan Evidence

Source: Microsoft Graph `/subscribedSkus`.

| Annex A requirement | Live entitlement | Service-plan evidence | Assignment source | Status | Gap | Required future decision |
| --- | --- | --- | --- | --- | --- | --- |
| Dynamics 365 Sales | `DYN365_ENTERPRISE_SALES`; `Dynamics_365_Multi_app_` | `DYN365_ENTERPRISE_SALES`: Success | Direct user assignments observed | VERIFIED | Product app/environment configuration not reviewed in Dynamics admin center | None for entitlement; separate promotion decision required |
| Dynamics 365 Customer Service | `Dynamics_365_Multi_app_` | `DYN365_ENTERPRISE_CUSTOMER_SERVICE`, `DYN365_CS_VOICE`, `DYN365_CS_MESSAGING_TPS`: Success | Direct user assignments observed | VERIFIED | Product app/environment configuration not reviewed in Dynamics admin center | None for entitlement; separate promotion decision required |
| Customer Insights / Journeys / Customer Voice | `Dynamics_365_Multi_app_`; `Forms_Pro_USL` | `DYN365_MARKETING_APP`: Success; `Forms_Pro_USL`: Success | Direct user assignments observed | VERIFIED | Customer Insights/Journeys configuration and consent-governance settings not reviewed in product admin center | Separate product configuration evidence before authority promotion |
| Copilot Studio / Microsoft Agent capability | Microsoft 365 Business Basic/Premium and Dynamics multi-app entitlements | `POWER_VIRTUAL_AGENTS_O365_P1`, `POWER_VIRTUAL_AGENTS_O365_P2`, `POWER_VIRTUAL_AGENTS_D365_CS_*`: Success | Direct user assignments observed; Copilot Studio service principals observed | PARTIALLY VERIFIED | Agent governance/configuration and environment scoping not fully reviewed in Copilot Studio admin surfaces | Separate agent commissioning/promotion decision required |
| Power BI / Fabric | `POWER_BI_PRO`; `POWER_BI_STANDARD` | `BI_AZURE_P2`, `BI_AZURE_P0`: Success | Direct user assignments observed | VERIFIED | Fabric workspace/capacity policy not reviewed beyond role/SKU readback | Separate promotion decision required |
| Teams application platform | Microsoft 365 Business Basic/Premium; Teams Essentials | `TEAMS1`, `MCOSTANDARD`, Teams telephony plans: Success | Direct user assignments observed | VERIFIED | Teams app policy and channel/app assignment not reviewed in Teams admin center | Product-policy readback before promotion |
| Power Apps / Dataverse | Power Apps per-app, Power Automate, Microsoft 365 Power Apps/Dataverse, Dynamics entitlements | `POWERAPPS_PER_APP`, `POWERAPPS_PER_APP_NEW`, `DATAVERSE_POWERAPPS_PER_APP_NEW`, `CDS_O365_P1/P2`, `DYN365_CDS_*`, `DYN365_CDS_P2`: Success | Direct user assignments observed | VERIFIED | Power Platform DLP/environment security not fully reviewed in PPAC | Separate product-admin evidence before promotion |
| Purview / Defender / compliance services | Microsoft 365 Business Basic/Premium; Power BI SKUs | `PURVIEW_DISCOVERY`, `RMS_S_BASIC`: Success | Direct user assignments observed | PARTIALLY VERIFIED | Defender-specific service plans and Purview/Defender policy availability not conclusively reviewed | Product-admin evidence required |

## Assignment Evidence

Source: Microsoft Graph `/users?$select=assignedLicenses`.

Direct license assignments were observed for 19 tenant users or service mailboxes, including the governed administrative identity, JM1 operational mailboxes, Jackie-controlled identities, and voice resource accounts.

Source: Microsoft Graph `/groups?$select=assignedLicenses`.

Group-based license assignments observed: 0.

## Administrative Role Evidence

Source: Microsoft Graph `/directoryRoles` and role member readbacks.

Relevant activated roles and observed members:

| Role | Evidence status | Observed assignment summary |
| --- | --- | --- |
| Global Administrator | VERIFIED | Jackie-controlled identities, break-glass admin, and jm1-admin observed |
| License Administrator | VERIFIED | jm1-admin observed |
| Power Platform Administrator | VERIFIED | jm1-admin, Jackie-controlled identities, JM1 Appointments, and AI Assistant Admins observed |
| Dynamics 365 Administrator | VERIFIED | jm1-admin, Jackie-controlled identities, JM1 Appointments, and AI Assistant Admins observed |
| Fabric Administrator | VERIFIED | jm1-admin observed |
| Teams Administrator | VERIFIED | jm1-admin, Jackie-controlled identities, JM1 Appointments, and AI Assistant Admins observed |
| AI Administrator | VERIFIED | jm1-admin observed |
| Security Administrator | VERIFIED | jm1-admin and JM1 Tech observed |
| Compliance Administrator | VERIFIED | jm1-admin observed |

No role assignments were created, modified, or removed.

## Enterprise Application / Service Principal Evidence

Source: Microsoft Graph `/servicePrincipals`.

Relevant installed applications/service principals were observed for:

- Dynamics 365 collaboration with Microsoft Teams.
- Microsoft Dynamics ERP Microservices CDS.
- Customer Experience Platform PROD.
- Multiple Microsoft Copilot Studio / Power Virtual Agents service principals, including D365 Sales and Customer Service agents.
- Microsoft Teams service principals.

This confirms installed-app presence for material Annex A Microsoft platform areas, but it does not by itself certify that each app is commissioned for JM1 enterprise use.

## Azure / Power Platform Evidence

Source: Azure Resource Manager read-only provider/resource readback.

- Microsoft.PowerPlatform provider registration: Registered.
- Power Platform account observed: `JM1CorePayGo2025` in `rg-jm1-core`.

No Power Platform capacity, environment security, DLP, or Dynamics configuration changes were made.

## Final Classification

Annex A classification: PENDING_EVIDENCE

Reason: Live tenant entitlement evidence verifies the major license, service-plan, installed-app, and administrative-role prerequisites discoverable through Microsoft Graph and Azure read-only APIs. However, product-admin-center configuration evidence remains incomplete for Power Platform/Dynamics environment security, Purview/Defender policy availability, Teams app policy, Customer Insights/Journeys configuration, and Annex A-specific app/agent commissioning boundaries.

Annex A promotion: NOT AUTHORIZED

License changes: 0

Permission changes: 0

Role assignments: 0

Service activations: 0

