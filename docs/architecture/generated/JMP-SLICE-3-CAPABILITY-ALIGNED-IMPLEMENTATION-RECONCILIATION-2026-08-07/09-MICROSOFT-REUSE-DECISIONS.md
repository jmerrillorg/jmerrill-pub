# Microsoft Reuse Decisions

UNKNOWN blocks implementation. Strategic Marketing UNKNOWN is resolved to EXTEND by read-only tenant readback showing `DYN365_MARKETING_APP` provisioned successfully. No Dynamics or marketing configuration was performed.

## Parent Capability Reuse

| Capability | Business need | Current coverage | Microsoft disposition | Reason |
| --- | --- | --- | --- | --- |
| Executive Control | Decision visibility and daily triage | Publisher Operating Center / docs | CONFIGURE | Use Power BI, Power Apps, Teams, Outlook approvals before custom daily surface expansion. |
| Commercial Operations | Lead, opportunity, quote, agreement, payment chain | custom intake/payment/agreement functions | CONFIGURE | Use D365 Sales, Business Central, Power Automate, and Dataverse projections first. |
| Author Experience | relationship, communication, author status | Author Operating Center; ACS/Exchange relay | EXTEND | Microsoft surfaces may handle much, but author experience may require extension. |
| Editorial | manuscript and package work | custom editorial command and scripts | CUSTOM_REQUIRED | Editorial judgment and package rules likely justify targeted custom logic. |
| Production & Distribution | PF, files, release, distribution | custom PF state design and distribution command | EXTEND | Use Dataverse/SharePoint/Power Automate where possible; PF-specific enforcement may need extension. |
| Strategic Marketing | campaigns, journeys, newsletter | manual/partial profile and newsletter routes | EXTEND | Tenant readback shows `DYN365_MARKETING_APP` provisioned successfully; extend/configure Microsoft marketing capability with publishing-specific lifecycle triggers, consent, cost-class, and reporting rules. |
| Financial Operations | revenue/accounting | Stripe + BC specs/proofs | CONFIGURE | Business Central, Stripe, Power Automate, and Dataverse projections should carry most work. |
| Post-Publication Operations | royalties/copies/retirement/reversion | royalty scripts/registers and copy policy | EXTEND | Publishing-specific royalties/copy/retirement logic likely extends Microsoft capabilities. |
| Enterprise Support | evidence, AI, reporting, platform | GitHub docs; Azure Functions; generated evidence | CONFIGURE | Prefer SharePoint, Power BI, Azure Monitor, Power Platform, and tenant readback. |

## Backlog Item Reuse

| Item | Work package | Microsoft disposition | Final disposition | Reason |
| --- | --- | --- | --- | --- |
| S3-01 | Canon and schema manifest | CUSTOM_REQUIRED | KEEP | Keep as documentation guard, but extend evidence references to the ruled capability register and Microsoft reuse gate. |
| S3-02 | Choice sets and transition registry | EXTEND | RE-SCOPE | Keep transition vocabulary, but scope it to Dataverse configuration first and avoid custom transition registry work until Microsoft options are exhausted. |
| S3-03 | Execution-log contract | EXTEND | KEEP | Keep because ruled system-of-record decisions depend on execution evidence, but integrate SharePoint/Power Platform evidence capture before custom log tooling expands. |
| S3-04 | Title and edition schema extensions | EXTEND | RE-SCOPE | Keep title/edition authority, but revise fields against the capability register, commercial authorization, author status, marketing triggers, and financial projections. |
| S3-05 | Security roles | CONFIGURE | KEEP | Keep as Microsoft-first configuration work using Dataverse role and field security rather than custom authorization code where possible. |
| S3-06 | Transition-validation service | CUSTOM_REQUIRED | RE-SCOPE | Retain fail-closed logic, but implement only after Dataverse/Power Automate validation paths are assessed and only for rules Microsoft configuration cannot enforce. |
| S3-07 | Protected transition endpoints | CONFIGURE | REPLACE_WITH_MICROSOFT | Replace endpoint-first posture with Power Apps/Power Automate/Dataverse command surfaces unless a custom endpoint is proven necessary. |
| S3-08 | Author-status projection | EXTEND | RE-SCOPE | Reconcile against Power Pages, Power Apps, Exchange, and existing web before assuming custom portal projection remains the correct surface. |
| S3-09 | Correction Authorized workflow | CONFIGURE | REPLACE_WITH_MICROSOFT | Use Microsoft approvals/Power Automate/Dataverse audit where sufficient; custom workflow only if approved exception behavior cannot be configured. |
| S3-10 | Release-plan model | EXTEND | RE-SCOPE | Re-scope because the ruled authority is Dataverse title/edition authority; no shadow release-plan object should be introduced. |
| S3-11 | Distribution-job model | EXTEND | REMOVE | Remove standalone distribution-job authority from this tranche; retain distribution attempts and outcomes as jm1_executionlog events. |
| S3-12 | Internal-title migration rehearsal | CONFIGURE | DEFER | Defer until commercial, financial, marketing, author, and daily-operator prerequisites are sequenced and approved. |
| S3-13 | Production certification | CUSTOM_REQUIRED | DEFER | Defer until revised implementation sequence completes and Jackie separately authorizes certification scope. |
