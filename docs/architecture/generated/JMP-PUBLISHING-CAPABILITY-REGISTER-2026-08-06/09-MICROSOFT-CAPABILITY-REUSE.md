# Microsoft Capability Reuse

No implementation recommendation is made. Disposition records reuse posture only.

| Capability | Business need | Current custom solution if any | Already-licensed Microsoft capability to check/use | Disposition | Current duplication | Operator burden |
| --- | --- | --- | --- | --- | --- | --- |
| Executive Control | Decision visibility and daily triage | Publisher Operating Center / docs | Power BI; Power Apps; Teams | CONFIGURE | custom dashboard and docs | daily Jackie review burden |
| Commercial Operations | Lead, opportunity, quote, agreement, payment chain | custom intake/payment/agreement functions | D365 Sales; Business Central; Power Automate | CONFIGURE | custom lead/opportunity/payment glue | manual chain reconciliation |
| Author Experience | relationship, communication, author status | Author Operating Center; ACS/Exchange relay | Exchange; Bookings; Customer Voice; Power Apps | EXTEND | custom portal and dispatch | manual status packaging |
| Editorial | manuscript and package work | custom editorial command and scripts | SharePoint; Power Automate; Copilot Studio where approved | CUSTOM_REQUIRED | custom editorial logic justified | source/package QA burden |
| Production & Distribution | PF, files, release, distribution | custom PF state design and distribution command | SharePoint; Power Automate; Power BI | EXTEND | custom distributor/job logic | manual readback and file tracking |
| Strategic Marketing | campaigns, journeys, newsletter | manual/partial profile and newsletter routes | Customer Insights-Journeys; Customer Voice | UNKNOWN | custom marketing scaffolds duplicate future Journeys risk | manual campaign memory |
| Financial Operations | revenue/accounting | Stripe + BC specs/proofs | Business Central; Stripe connector via custom; Power Automate | CONFIGURE | custom payment bridge | manual accounting reconciliation |
| Post-Publication Operations | royalties/copies/retirement/reversion | royalty scripts/registers and copy policy | Business Central; Power BI; Power Automate | EXTEND | custom royalty calculation proof | quarterly reconciliation burden |
| Enterprise Support | evidence, AI, reporting, platform | GitHub docs; Azure Functions; generated evidence | SharePoint; Power BI; Azure Monitor; Copilot Studio | CONFIGURE | custom evidence packages and functions | manual evidence assembly |

## Replacement Candidates

Custom builds duplicating licensed capability are flagged as REPLACEMENT CANDIDATE: intake/opportunity routing, quote tracking, newsletter/journey handling, campaign calendar, current-work dashboard, routine status reporting, agreement artifact filing, payment status reconciliation, royalty reporting, evidence dashboarding, and reminder/follow-up tracking. Count: 11.

## Microsoft Capabilities Currently Unused or Unproven by Publishing

| Capability | Status | Evidence |
| --- | --- | --- |
| Dynamics 365 Sales | partially/indirectly represented only | PROGRAM-004 delta report |
| Dynamics 365 Customer Insights / Journeys | unverified / hold | Microsoft utilization matrix |
| Customer Voice | unverified | Annex A entitlement evidence register |
| Power BI / Fabric | not consolidated as Publishing operating dashboard | PROGRAM-004 requirement register |
| Power Apps | no governed daily Publishing app proven | PROGRAM-004 delta report |
| Copilot Studio / Agent 365 | held pending entitlement/governance | Agent access review and Program 004 records |
| Business Central production posting | not activated for Publishing revenue/royalty flow | BC/royalty evidence records |

Unused/unproven count: 7. Potential custom systems avoided if Microsoft-native capabilities are ruled in later: 11.
