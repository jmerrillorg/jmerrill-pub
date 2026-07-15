---
Status: CANDIDATE — VALIDATED PARTIALLY
Classification: Spec-only
Production Implementation Authorized: No
Annex A Authority: Candidate pending tenant validation and separate Jackie approval
Verified Date: 2026-07-15
last_verified_date: 2026-07-15
---

# ADR-JM1-V3-EXT-001 Annex A Validation v0.1

Annex A remains CANDIDATE — VALIDATED PARTIALLY. Validation does not make Annex A authoritative.

## Evidence Sources Used

- Azure subscription: `JM1 – Nonprofit Core (2025 Grant)` / `9ee13245-2303-4010-8b6d-35f7cbcfdc0e`
- Azure tenant: `352d075e-8e17-4169-9f8e-22e6946ce66d`
- Azure resource inventory from `az resource list`, verified 2026-07-15
- GitHub repository/workflow status from `gh repo view` and `gh run list`, verified 2026-07-15
- Repository CAP-010 refresh evidence

## Platform Validation Summary

| Platform | Entitlement Status | Installed Status | Capacity / Provisioning Status | Evidence Source | Confidence | Open Gap |
|---|---|---|---|---|---|---|
| Dynamics 365 Sales Enterprise | Partially Verified | Not verified in this pass | Not verified | Requires M365/Power Platform admin-center license/app evidence | Low | Admin-center entitlement and installed-app read needed |
| Dynamics 365 Customer Service | Partially Verified | Not verified in this pass | Not verified | Requires M365/Power Platform admin-center evidence | Low | Admin-center entitlement and installed-app read needed |
| Digital Messaging | Not Found | Not verified | Not verified | No CLI evidence located | Low | Admin-center validation required |
| Voice | Not Found | Not verified | Not verified | No CLI evidence located | Low | Admin-center validation required |
| Field Service | Not Found | Not verified | Not verified | No CLI evidence located | Low | Admin-center validation required |
| Customer Voice | Not Found | Not verified | Not verified | No CLI evidence located | Low | Admin-center validation required |
| Customer Insights - Journeys | Not Found | Not verified | Not verified | No CLI evidence located | Low | Admin-center validation required |
| Power Apps | Partially Verified | Power Platform account found | Account `JM1CorePayGo2025` in `rg-jm1-core` | Azure resource `/Microsoft.PowerPlatform/accounts/JM1CorePayGo2025` | Medium | License/capacity/admin-center validation still needed |
| Power Automate | Partially Verified | Logic App + Office 365 connections found | Logic workflow `la-jm1-gov-notify`; Office 365 connections | Azure resources in `rg-jm1-core` | Medium | Tenant licensing/capacity validation still needed |
| Copilot Studio | Not Found | Not verified | Not verified | No CLI evidence located | Low | Admin-center validation required |
| Dataverse environment | Partially Verified | Operational Core Web API used | JM1-Core resource URL `https://jm1hq.crm.dynamics.com` used by live CAP-009/CAP-010 reads/writes | CAP-009/CAP-010 Core operations | High | Installed solution inventory not completed in this pass |
| Business Central | Partially Verified | Browser/app evidence previously present; no admin read in this pass | Not verified | Existing browser context and CAP-007 docs; no fresh admin API evidence | Medium | BC admin-center readback required |
| Azure subscription ownership | Verified | Active subscription | `JM1 – Nonprofit Core (2025 Grant)` | `az account show` | High | None for subscription identity |
| Azure Communication Services | Verified | Resource exists | `acs-jm1-core` in `rg-jm1-communications` | Azure resource inventory | High | Channel-specific provisioning details remain to validate |
| ACS Email | Verified | Email service/domain exists | `email-jm1-core`; domain `email.jmerrill.one` | Azure resource inventory | High | Sender/address policy details outside this pass |
| Phone number resources | Not Found | Not verified | Not verified | No phone-number resources found in Azure inventory | Low | ACS phone-number API/admin check needed |
| Teams interoperability | Not Found | Not verified | Not verified | No CLI evidence located | Low | Teams/ACS admin validation needed |
| Entra External ID | Verified | CIAM directory exists | `jm1authorid` in `rg-jm1-external-id` | Azure resource inventory | High | CIAM app settings already proven in CAP-008; full tenant config audit not repeated |
| Azure AI Foundry | Verified | Account + project exist | `ais-jm1-foundry`; project `jm1-editorial-foundry` in `eastus2` | Azure resource inventory | High | Model deployment/quota details outside this validation |
| Azure OpenAI | Verified | Account exists | `oai-jm1-diagnostic` in `rg-jm1-ai` | Azure resource inventory | High | Deployment list not captured here |
| Key Vault / Managed Identity | Verified / Partial | Vaults and identities found | `jm1-core-vault`, `kv-jm1-core`, `jm1-core-managed-identity`, OIDC identities | Azure resource inventory | High | Secret values not exposed; private-link vault read restricted from this shell |
| Power BI / Fabric | Not Found | Not verified | Not verified | No CLI evidence located | Low | Power BI/Fabric admin validation required |
| SharePoint / OneDrive / Teams / Outlook | Partially Verified | Office365 connections found; SharePoint site used in prior operations | Not fully verified | Azure Office 365 connections + prior SharePoint Gate 1 evidence | Medium | Tenant admin/source-of-truth location audit remains |
| Bookings | Partially Verified | Public booking link exists in site nav | Not verified | AOC navigation includes Outlook Bookings URL | Medium | M365 admin entitlement validation needed |
| GitHub | Verified | Repository and workflows active | `jmerrillorg/jmerrill-pub`, main branch, recent successful SWA workflows | GitHub CLI | High | None for repository/workflow presence |
| Planning Center / AIC separate authority | Partially Verified | AIC resources exist separately in Azure | AIC web/static/app resources in `agape-international-cathedral-rg` | Azure resource inventory | Medium | Planning Center authority record not available through current shell |

## Discrepancies and Blockers

- Accepted ADR v0.4 source text is now filed at `00_SYSTEM/Architecture/ADR/ADR-JM1-V3-EXT-001-v0.4.md`; Annex A remains Candidate and still requires separate Jackie approval before becoming authoritative.
- M365 license and installed-app evidence for Dynamics, Customer Voice, Customer Insights, Copilot Studio, Power BI/Fabric, and Teams requires admin-center or Microsoft Graph entitlement access not completed in this pass.
- Validation alone does not promote Annex A to authoritative.
