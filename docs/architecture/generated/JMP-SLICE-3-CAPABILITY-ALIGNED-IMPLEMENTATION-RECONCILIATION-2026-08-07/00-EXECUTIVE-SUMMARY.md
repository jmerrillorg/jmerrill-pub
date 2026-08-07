# Slice 3 Capability-Aligned Implementation Reconciliation

Classification: IMPLEMENTATION RECONCILIATION / PLANNING ONLY / NO RUNTIME AUTHORITY

Date: 2026-08-07
Authority baseline: Publishing Capability Register canonical on main at merge SHA `96c9e6962c7f515173cced0ecfeca2e4407126c0`.

## Decision

Can the existing Slice 3 implementation plan proceed unchanged?

NO.

What remains valid: the PF state machine, title/edition authority, execution-log taxonomy, transition matrix, author-safe status concept, correction authorization concept, and guarded internal rehearsal discipline.

What must change: the implementation sequence must no longer start from title-lifecycle runtime alone. Commercial Operations, Financial Operations, Executive Control, Strategic Marketing, Author Experience, and Microsoft reuse decisions must be represented before runtime work proceeds.

Microsoft tools that may remove custom work: Dynamics 365 Sales, Business Central, Power Automate, Power Apps, Power BI/Fabric, SharePoint, Exchange, Teams/Approvals, Customer Insights/Journeys if entitlement and fit are proven.

Missing integrations before runtime: lead/opportunity/quote/order, Stripe-to-authorization projection, Business Central financial handoff, lifecycle marketing, author-facing Microsoft surface decision, daily Jackie operating surface, and post-publication money/copy/royalty/retirement support.

## Counts

Existing Slice 3 planning backlog items: 13

| Disposition | Count |
| --- | --- |
| KEEP | 3 |
| REPLACE_WITH_MICROSOFT | 2 |
| RE-SCOPE | 5 |
| DEFER | 2 |
| REMOVE | 1 |
| BLOCKED_UNKNOWN | 0 |


## Microsoft Reuse Counts

Counts below combine 13 existing backlog items and the 9 parent capability reuse decisions, because the package must assess both implementation items and capabilities.

| Microsoft disposition | Count |
| --- | --- |
| USE_AS_IS | 0 |
| CONFIGURE | 8 |
| EXTEND | 9 |
| CUSTOM_REQUIRED | 4 |
| UNKNOWN | 1 |


Replacement candidates: 2 direct backlog replacements, plus 11 capability-register reference candidates logged under the Microsoft Capability Reuse Gate.

Potential custom builds avoided in the revised sequence: 5.

## Operator Burden

Current Jackie actions: 18
Target Jackie actions: 7
Net actions removed: 11
Actions automated or system-routed: 10
Actions remaining appropriate: 7
New burden introduced: 0

## Capability Coverage

| Area | Representation |
| --- | --- |
| Commercial Operations | PARTIAL |
| Financial Operations | PARTIAL |
| Strategic Marketing | PARTIAL |
| Author Experience | PARTIAL |
| Post-Publication | PARTIAL |
| Executive Control | PARTIAL |


## Top Ten Changes to Original Slice 3 Plan

1. Re-sequence Commercial Operations before title-lifecycle runtime.
2. Re-sequence Financial Operations before fulfillment automation.
3. Treat Dynamics 365 Sales as the lead/opportunity/quote/order default candidate.
4. Preserve Stripe as payment transaction truth and Dataverse as authorization projection.
5. Preserve Business Central as accounting/payable/posting/payment/GL authority.
6. Replace endpoint-first transition actions with Microsoft command/approval surfaces unless custom need is proven.
7. Remove standalone distribution-job authority; use `jm1_executionlog` events per ruling.
8. Re-scope release planning to Dataverse title/edition authority, not a shadow release-plan object.
9. Add lifecycle-triggered marketing as a first-class plan lane.
10. Add one daily Jackie operating surface as a prerequisite to runtime activation.

## Boundary

Runtime implementation: 0
Dataverse mutations: 0
Business Central mutations: 0
Stripe mutations: 0
D365 mutations: 0
SharePoint operational library changes: 0
Workflow activations: 0
Website deployments: 0
Author communications: 0
Agreement changes: 0
Commercial catalog changes: 0
Client-title automation: FROZEN
Client-title production: MANUAL
