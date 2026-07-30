# 03 Current State Property Register

Generated: 2026-07-30T00:28:45.618Z
Gate: GATE-W2 - Enterprise Web Platform Topology & Cost Approval
Mode: DISCOVERY_AND_DECISION_SUPPORT
Branch: codex/gate-w2-enterprise-web-topology-cost
Authority: Jackie; GATE-W1 certified reference; no implementation authorized.

| Domain | Resource | Technology | Subscription | ResourceGroup | Region | Repository | Workflow | Staging | Cost | Readiness | Disposition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| jmerrill.pub | app-jm1-pub-prod; asp-jm1-pub-prod-linux S1; legacy SWA jmerrill-pub Free | App Service Linux / Next.js standalone; legacy SWA Free | JM1 Nonprofit Core | rg-jm1-pub-prod-appsvc; legacy jmerrill-pub | Central US | jmerrill-pub | Publishing App Service CI/CD; Azure Static Web Apps CI/CD legacy | App Service staging slot; SWA preview legacy | Calculated App Service S1 69.35/mo + minimal diagnostics | CERTIFIED_REFERENCE | Keep as reference isolated Publishing plan |
| jmerrill.one | Static Web App jmerrill-one Standard | Azure Static Web Apps | JM1 Nonprofit Core | jmerrill-one | East US 2 | jmerrill-one | Deploy JM1 Web to Azure Static Web Apps | SWA staging/preview enabled | Calculated SWA Standard 9/mo | Corporate shared plan candidate | Migrate to enterprise shared App Service app or shared web platform |
| jmerrill.financial | Static Web App jmerrill-financial Standard; jm1-book-redirector Free | Azure Static Web Apps | JM1 Nonprofit Core | jmerrill-financial_group; jm1-core-services | East US 2 | jmerrill-financial; jm1-book-redirector | Azure Static Web Apps CI/CD | SWA staging/preview enabled | Calculated SWA Standard 9/mo plus redirect Free | Migrate after scheduling/authority stabilization | Shared plan with isolated app initially; split trigger defined |
| jmerrill.org | Static Web App org-to-foundation-redirect Free | SWA redirect to Foundation | JM1 Nonprofit Core | jm1-core-services | East US 2 | org-to-foundation-redirect | Azure Static Web Apps CI/CD | SWA preview enabled | Calculated Free $0/mo | Redirect-only consolidation candidate | Move to governed redirect mechanism, retire repo/SWA after checklist |
| jmerrill.foundation | Static Web App foundation-main Free | Azure Static Web Apps | JM1 Nonprofit Core | jm1-core-services | East US 2 | jmerrillfoundation | Deploy jmerrill.foundation | SWA preview enabled | Calculated Free $0/mo | Corporate/shared plan candidate after content parity | Migrate with corporate wave or retain static until Foundation strategy |
| jmerrill.productions | Static Web App jmerrill-productions Free | Azure Static Web Apps | JM1 Nonprofit Core | jmerrill-productions-rg | Central US | jmerrill-productions | Deploy J Merrill Productions | SWA preview enabled | Calculated Free $0/mo | Defer until active owner/content decision | Keep paused; migrate later or redirect/retire |
| jackiesmithjr.com | Static Web App jackiesmithjr Free | Azure Static Web Apps | JM1 Nonprofit Core | jm1-core-services | East US 2 | jackiesmithjr | Azure Static Web Apps CI/CD | SWA preview enabled | Calculated Free $0/mo | Low-risk later wave | Migrate late to shared plan or retain SWA until site refresh |

## Excluded

| Property | Separation | Dependency |
| --- | --- | --- |
| Agape International Cathedral | Separate App Service/SWA resources in agape-international-cathedral-rg; explicitly excluded | Document only; no migration/modification under GATE-W2 |
| Marcus McIntosh | marcusmcintosh.org Azure DNS zone observed; explicitly excluded | Document only; no migration/modification under GATE-W2 |
