# Operating Model

The nine capabilities are the operating model. Prior command centers, agents, studios, and pipelines reconcile inside these capabilities.

| Capability | Owns | Trigger | System of record | Currently requires Jackie to do manually | Should require Jackie to do |
| --- | --- | --- | --- | --- | --- |
| Executive Control | Daily executive decisions | New inquiry, exception, approval, operating ambiguity, risk, or daily triage | Operating Manual; Successor Hub; Publisher Operating Center | Decide, review, prioritize, approve exceptions, remember holds | Decision approval and exception judgment only; routing/reminders/reports should be surfaced automatically |
| Commercial Operations | Lead to opportunity to quote to agreement to payment authorization | Inquiry accepted, package/track decision, quote, agreement, payment evidence | Commercial catalog; pricing register; agreement templates; Dataverse/D365 candidate | Choose track/price exceptions, verify payment/quote/agreement continuity | Decisions and exceptions only; template selection, quote assembly, filing, version capture automated or configured |
| Author Experience | Author relationship, onboarding, communication, status clarity | Accepted title, onboarding, author action, review package, concern, delay | Author Operating Center; Exchange/ACS; Successor SOPs | Relate, approve sensitive messages, handle trust moments | Relationship and exception communication; reminders/status packaging automated |
| Editorial | Manuscript development and editorial decision movement | Controlling manuscript, developmental edit, copyedit, proof, correction request | SharePoint manuscripts; editorial artifacts; execution evidence | Set editorial judgment and approve sensitive recommendations | Editorial judgment; source tracking/package QA/reconciliation automated or checklist-driven |
| Production & Distribution | Product Forms, editions, production, release, distribution | FTL, PF election, production package, submission, live confirmation | Commercial catalog; PF architecture; SharePoint; distributor evidence | Approve formats/exceptions and production-sensitive decisions | Judgment on scope/quality; file tracking, release evidence, propagation reminders automated |
| Strategic Marketing | JMP, author, and title lifecycle marketing | Intake profile, launch readiness, release anchor, post-publication review | Marketing profile; website; future Customer Insights/Journeys | Create positioning, approve campaigns, relationship-sensitive outreach | Creative strategy and approval; routine lifecycle triggers, lists, scheduling, reporting automated/configured |
| Financial Operations | Revenue, payment evidence, Stripe, Business Central, accounting | Quote/payment, Stripe event, invoice/accounting close | Stripe; Business Central; Dataverse opportunity/payment fields | Approve exceptions and accounting decisions | Financial judgment; payment status, reconciliation, BC handoff configured |
| Post-Publication Operations | Royalties, copies, retirement, reversion, ongoing title management | Published title, royalty period, copy fulfillment, correction, retirement/reversion | Royalty registers; author copy policy; title records | Approve royalty decisions, identity exceptions, retirement/reversion | Publisher/legal judgment; royalty calculation, copy tracking, reminders, statements automated/configured after authorization |
| Enterprise Support | Microsoft ecosystem, AI, reporting, evidence, security, platform support | Operational support need, report, incident, evidence package, automation question | SharePoint; Exchange; Dataverse; Power Platform; Azure; GitHub | Approve activation and risk posture | Activation/risk decisions; evidence indexing, reporting, telemetry automated |

## Executive-Ruled Visible Capabilities

These capabilities remain visibly named even when they sit under one of the nine parent capabilities.

| Capability | Parent capability | Ruling basis |
| --- | --- | --- |
| Author Communications | Author Experience | Communication governance, delivery proof, templates, and response-clock integrity remain visibly named under Author Experience. |
| Author Operating Center | Author Experience | Author Experience is the family; the Operating Center remains the distinct channel through which authors act. |
| Distribution Readiness and Submission | Production & Distribution | Submission, distributor acceptance/readback, and external-channel proof remain distinct from producing files. |
| Payment Capture and Authorization | Commercial Operations | Publishing retains a visible payment/authorization gate where Stripe/payment truth intersects fulfillment authorization. |
| Royalty Calculation and Statements | Post-Publication Operations | Royalties remain a distinct post-publication obligation and do not disappear into accounting or generic post-publication language. |
| No-Cost Author Marketing Framework | Strategic Marketing | Retained as the boundary between included JMP support and separately scoped marketing, preserving prior strategic work. |
| Publisher Operating Center | Executive Control | Retained because a single-operator enterprise needs daily visibility without manual reconstruction. |
| Revenue and Accounting | Financial Operations | Financial Operations remains visibly real; Business Central/accounting does not disappear behind publishing lifecycle language. |
| Strategic Marketing Command Center | Strategic Marketing | Retained as the identifiable operating mechanism for lifecycle-triggered JMP, author, and title marketing. |

## Absorbed Functions Preserved Under Parent Capability

ABSORB does not delete, retire, or stop the function. These functions, aliases, controls, and evidence remain governed under the ruled parent capability.

| Absorbed function | Parent capability | Preservation requirement |
| --- | --- | --- |
| Cover Design | Production & Distribution | Absorbed into Production & Distribution with cover-specific approval, QA, and production dependencies preserved. |
| Editorial Command Center | Editorial | Absorbed as the operating mechanism for Editorial with queues and gates preserved explicitly. |
| Interior Layout and Vellum Production | Production & Distribution | Absorbed as a Production & Distribution lane with source lineage, layout QA, and proof controls preserved. |
| Lead and Opportunity Management | Commercial Operations | Absorbed into Commercial Operations, preferably leveraging Dynamics 365 Sales rather than a separate JMP command center. |
| Line Copy and Proof Editing | Editorial | Absorbed as explicit editorial stages under Editorial without independent top-level capability status. |
| Newsletter and Reader Updates | Strategic Marketing | Absorbed as a Strategic Marketing channel/tactic with audience consent and subscription rules preserved. |
| Release Live Confirmation | Production & Distribution | Absorbed into Production & Distribution with submitted-not-live proof rule preserved. |
| Stripe and Payout Enrollment | Financial Operations | Absorbed into Financial Operations with enrollment/readiness kept distinct from money movement. |
| Workflow Engine and Dispatch Services | Enterprise Support | Absorbed as Enterprise Support enabling infrastructure, not a separate business capability Jackie operates. |
| Microsoft Ecosystem and Tenant Support | Enterprise Support | Absorbed into Enterprise Support with no meaningful loss; Microsoft support is not a standalone Publishing capability. |
