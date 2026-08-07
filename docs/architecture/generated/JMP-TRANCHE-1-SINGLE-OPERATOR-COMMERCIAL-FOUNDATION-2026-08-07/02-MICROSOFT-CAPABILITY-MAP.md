# Microsoft-First Commercial Mapping

All requirements have a final Microsoft disposition. Dynamics 365 Sales is the first-place candidate for lead, opportunity, product, price list, quote, order, stages, activities, approvals, and dashboards.

| Requirement | Microsoft capability | Disposition | Tranche 1 use | Boundary |
| --- | --- | --- | --- | --- |
| Lead | Dynamics 365 Sales | CONFIGURE | Use D365 Lead with source, author legal name, contact info, inquiry source, preferred package/track if known, next activity. | No custom lead store; Dataverse keeps publishing reference only. |
| Contact | Dynamics 365 Sales / Dataverse contact | CONFIGURE | Use contact/account records for author identity and relationship references. | Do not duplicate author identity in custom tables. |
| Account | Dynamics 365 Sales | CONFIGURE | Use account only where commercial customer/entity relationship requires it. | Do not force every author into unnecessary account complexity if Sales supports contact-led flow. |
| Opportunity | Dynamics 365 Sales | CONFIGURE | Use opportunity for qualified commercial pursuit, package/track context, quote/agreement/payment status. | Dataverse publishing state references the opportunity; it does not replace it. |
| Product | Dynamics 365 Sales Product Catalog | EXTEND | Use products as projections of canonical commercial catalog items. | Commercial catalog remains authority; D365 product records are projections. |
| Price List | Dynamics 365 Sales Price Lists | EXTEND | Use price lists as governed projections of approved pricing authority. | No second pricing authority. |
| Quote | Dynamics 365 Sales Quote | EXTEND | Use quote for offer assembly and status, with catalog-backed package/PF/add-on lines. | Custom only for publishing-specific PF/package validation. |
| Order | Dynamics 365 Sales Order | CONFIGURE | Use order as commercial commitment after accepted quote/agreement boundary, pending Tranche 2 financial handoff. | Do not use order to authorize publishing by itself. |
| Sales stages | Dynamics 365 Sales business process flow | CONFIGURE | Configure stages to match commercial state model. | Avoid custom state machine unless D365 cannot hold required gates. |
| Activities | Dynamics 365 Sales activities; Outlook; Teams | USE_AS_IS | Use native tasks, appointments, emails, and follow-ups for routine reminders. | Keep relationship-sensitive communication with Jackie. |
| Approvals | Teams / Power Automate Approvals | CONFIGURE | Use for exceptions, special terms, agreement issuance approval, and fulfillment override. | No workflow activation under this plan. |
| Dashboards | Dynamics dashboards / Power BI / Power Apps | CONFIGURE | Configure one daily operator surface using Microsoft data. | Existing custom Publisher Operating Center only extends gaps if needed. |
| Copilot Studio | Copilot Studio | DEFERRED | Not required for the Tranche 1 foundation path; any assistant behavior needs separate design/proof. | Do not use Copilot Studio as a dependency for commercial foundation implementation. |
