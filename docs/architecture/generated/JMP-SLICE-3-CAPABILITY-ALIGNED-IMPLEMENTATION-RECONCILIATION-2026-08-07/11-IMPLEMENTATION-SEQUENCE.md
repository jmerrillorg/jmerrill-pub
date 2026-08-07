# Implementation Sequence

The previous Slice 3 sequence is not reused automatically. This sequence is based on business dependencies and the ruled capability model.

| Sequence | Tranche | Scope | Parent capabilities | Why before title runtime |
| --- | --- | --- | --- | --- |
| 1 | Commercial and Microsoft Reuse Foundation | Configure/decide D365 Sales, lead/opportunity/quote/order posture, and Microsoft reuse dispositions before custom runtime. | Commercial Operations; Enterprise Support | Prevents title lifecycle runtime from bypassing sales/payment authorization. |
| 2 | Financial Operations Foundation | Decide Stripe/Dataverse/Business Central handoffs for package payments, add-ons, fees, retail revenue, refunds, royalties, and GL. | Financial Operations | Answers where money goes before fulfillment automation. |
| 3 | Executive Daily Surface Prototype Specification | Specify Power Apps/Power BI/Teams daily surface for Jackie needs, overdue items, waiting authors, blocked titles, money, marketing, and distribution exceptions. | Executive Control | Ensures automation reduces one-operator burden instead of creating another monitoring surface. |
| 4 | Author Experience Surface Decision | Decide Power Pages/Power Apps/existing web split for onboarding, status, downloads, review packages, corrections, and marketing profile. | Author Experience | Avoids custom portal expansion unless Microsoft cannot satisfy author operations. |
| 5 | Strategic Marketing Lifecycle Configuration | Map lifecycle triggers into Customer Insights/Journeys/Dynamics/Power Automate candidates with no invented campaigns. | Strategic Marketing | Keeps marketing throughout the lifecycle, not only at launch. |
| 6 | Title/Edition/PF Schema Revision | Revise Slice 3 schema spec to reflect capability register, release-plan ruling, distribution-job ruling, financial/commercial gates, and author/marketing projections. | Production & Distribution | Only then should title lifecycle runtime schema proceed. |
| 7 | Transition and Correction Enforcement | Configure Microsoft approvals/business rules first; custom validation only for fail-closed publishing rules that cannot be configured. | Editorial; Production & Distribution | Keeps state machine valid while reducing custom code. |
| 8 | Evidence and Execution Logging Implementation Design | Implement or configure event evidence with Dataverse jm1_executionlog, SharePoint evidence, and Power Platform auditing. | Enterprise Support | Preserves ruled system-of-record decisions. |
| 9 | Internal Non-Client Rehearsal | Run internal title rehearsal only after the revised sequence gates pass and Jackie authorizes data use. | Executive Control | No client-title automation thaw. |
| 10 | Production Certification Decision | Separate executive ruling for production runtime, client-title thaw criteria, rollback, and certification evidence. | Executive Control | Prevents governance merge from becoming runtime activation. |
