# PROGRAM-002 - Initial Backlog

**Status:** APPROVED FOR CONTINUED IMPLEMENTATION / COUNCIL REVIEW CLOSED
**Date:** 2026-07-01
**Program:** PROGRAM-002 Autonomous Publishing Production Pipeline

## Backlog Doctrine

Build one operational module to completion before starting the next module.

Each item must produce a working production-useful capability or a precise blocker. Do not expand PROGRAM-002 into broad architecture work.

Council review is closed. Implementation is active. Council re-engagement occurs only for a major operational milestone, material architectural decision, operational blocker requiring executive review, or Jackie request.

## Initial Backlog

| ID | Module | Objective | Status | Dependencies | Completion Standard |
|---|---|---|---|---|---|
| OP-001 | SharePoint Workspace Lifecycle | Create and move author-first, title-aware SharePoint workspaces from inquiry through post-distribution | Complete / Operational | Publishing Team SharePoint; JM1-Core | Workspace lifecycle mapped; folder creation validated; workspace writeback fields now available |
| OP-002 | Contract / Payment / Portal Activation | Generate contract/payment actions after setup completion and unlock the active portal after signed/active agreement plus confirmed payment or publisher financial override | Complete / Operational; sequencing corrected | OP-003 pre-contract portal; agreement status source; payment confirmation source | Activation bridge eligible; workspace moved to onboarding/active state; active portal unlock occurs only after agreement/payment gate |
| OP-003 | Author Portal MVP | Provide pre-contract author setup portal after author acceptance and before agreement/payment generation | Complete / Operational; access model correction in progress | Author acceptance; portal surface; approved pre-contract setup model | Portal shows only Author Onboarding, Financial Setup, and Royalty Setup until setup is complete; active dashboard/files/contracts/royalties remain hidden; author/project-specific data requires Dataverse-backed access |
| OP-004 | ISBN / LCCN / Copyright Registration Command Center | Manage registration tasks, identifiers, evidence, blockers, and approvals | Not Started | OP-003 or approved internal command center path | Registration tasks, statuses, evidence, and blockers are trackable |
| OP-005 | Editorial Command Center | Run editorial workflow from manuscript intake through editorial approval | Not Started | OP-004; manuscript and editorial stage records | Editorial status, tasks, approvals, and files are operationally visible |
| OP-006 | Cover Design Command Center | Coordinate cover design assets, status, approvals, and handoff | Not Started | OP-005 | Cover design workflow and approval state are trackable |
| OP-007 | Interior Layout Command Center | Coordinate interior layout, proof readiness, and production file handoff | Not Started | OP-006 | Interior layout workflow and production files are trackable |
| OP-008 | Distribution Command Center | Manage distribution readiness, metadata, files, and channel status | Not Started | OP-007 | Distribution status and blockers are visible before launch |
| OP-009 | Launch / Metadata / Retail Readiness Command Center | Manage launch, metadata, retail readiness, and author-facing launch milestones | Not Started | OP-008 | Launch checklist and retail readiness are operationally visible |
| OP-010 | Marketing / Campaign Command Center | Manage positioning, campaign planning, launch assets, review/award tracking, outreach, performance summary, and relationship marketing opportunities | Not Started | OP-009 or approved parallel marketing intake path | Marketing is active throughout the pipeline and not delayed until launch |
| OP-011 | Royalty / Relationship Dashboard | Provide ongoing royalty and author relationship visibility when live royalty operations are authorized | Not Started | OP-010; live royalty authorization for production statements | Ongoing relationship dashboard works without unauthorized payments or live royalty generation |

## Author Portal Trigger

Author Portal creation occurs after author acceptance and before contract generation:

1. New author: create one author portal.
2. Returning author: add the accepted title to the existing author portal.
3. Never create a second portal for the same author relationship.

The pre-contract portal is intentionally locked and shows only Author Onboarding, Financial Setup, and Royalty Setup. It must display:

`Complete the steps below to begin your publishing journey.`

After all three setup steps are complete, generate the contract package and invoice/payment request and show Sign Agreement and Submit Payment actions.

When agreement is signed/active and payment is confirmed, or a publisher financial override is approved, OP-002 unlocks the active portal.

Portal may display approved marketing module information only after the marketing module is live. The portal remains a display/action layer and must not become the system of record.

Author Portal access must be author/project-specific before private project data is displayed. A master/admin access code may be retained for Jackie/admin review only and must remain in secure app settings.

## Workspace Lifecycle Dependency

OP-001 is the workspace foundation:

- Initial workspace location: `01_Pre-Pipeline/00_Inquiry`
- Folder model: author-first and title-aware
- Folder movement: move the same workspace through stages
- No duplicate folders
- SharePoint write authentication has been restored and Dataverse workspace fields are now available
- Dataverse remains the stage/status authority

## Marketing Throughout Pipeline

Marketing is a through-line across the pipeline, not a launch-only activity. Each OP module must identify any marketing signal, handoff, or dependency.

Every OP specification must include Marketing Signal / Handoff, Purpose, Author-facing assets, Internal assets, Automation trigger, and Success criteria.

Required touchpoints include:

- Intake / Diagnostic: positioning signal, audience, comparable titles, author platform, market category, reader promise
- Publisher Review: commercial opportunity, cultural relevance, campaign potential, author visibility, prestige/trade potential
- Contract / Onboarding: author marketing questionnaire, platform assets, media history, endorsements, speaking opportunities
- Editorial: message clarity, reader promise, audience alignment, positioning language
- Cover / Interior: market fit, genre expectation, prestige posture, campaign usability
- Distribution: metadata posture, categories, keywords, BISAC, retailer readiness, library/bookstore posture
- Launch: launch calendar, review strategy, campaign copy, media kit, email/social assets
- Post-Launch: review tracking, award submissions, long-tail optimization, campaign performance, future author relationship opportunities

## JM Signature Governance Overlay

JM Signature is publisher-selected, invitation-only, not purchasable, not package-based, not author-selected, and not automatically assigned by AI.

AI may flag `Potential JM Signature Candidate`; Publisher decides.

JM Signature is captured as a governance overlay now. It is not moved ahead of the core production machine. Each OP module must answer whether it needs JM Signature-specific governance.

## Management by Exception

Every OP module must answer whether Jackie needs to know when nothing is wrong. If yes, redesign the workflow.

Only approval needs, exceptions, blockers, missed SLAs, author risk, payment issues, and production issues should surface routinely.

## First Build Item

**OP-001 - SharePoint Workspace Lifecycle**

OP-001 is the first recommended operational build because serious `/join` inquiries and accepted/current authors need a governed workspace lifecycle that mirrors the pipeline without duplicate folders and without making SharePoint the system of record.

OP-001, OP-002, and OP-003 have been completed and validated as operational. OP-004 Registration Command Center is the next PROGRAM-002 module.

## Current Blockers / Constraints

| Blocker / Constraint | Blocking | Notes |
|---|---|---|
| SharePoint connector write reauthentication | None | Resolved during OP-001 validation |
| Missing Dataverse workspace fields | None | Resolved by OP-002 minimal Dataverse field build |
| Live Stripe not approved | OP-002 payment request/payment confirmation | Submit Payment remains hidden until approved Stripe path is configured |
| Business Central production not ready | OP-002/OP-003 accounting display | Do not show BC accounting summaries until production-ready |
| Adobe Sign license/API entitlement | Agreement automation | Use approved manual/alternate agreement evidence path until entitlement is resolved |
| Payment timing policy | Routine payment-link use | Contract/payment actions appear only after all three pre-contract setup steps are complete |
| OP-002 controlled production validation | None | Complete; Jackie-owned active project validated with no synthetic records |
| Marketing delayed until launch | All modules | Each module must capture marketing signal/handoff/dependency |
| JM Signature public/application misuse | All modules | Publisher-only overlay; no public application path or paid upgrade |
| Live royalty generation not approved | OP-011 | Royalty dashboard can remain planning/review-only until authorized |
| Dataverse portal access fields not confirmed | OP-003 author-specific portal access | Website service-principal metadata inspection returned HTTP 403; inspect/reuse existing fields before schema changes |

## Capture Boundary

This capture/control update did not:

- create flows
- modify Dataverse
- modify SharePoint
- modify Business Central
- connect Stripe
- send communications
- create author portals
- create SharePoint folders
- commit or push

Subsequent authorized OP-002 work added only the minimum Dataverse fields approved by Jackie. OP-002 controlled production validation passed on 2026-07-01 using Jackie-owned active project records. No live Stripe, Business Central posting, royalty generation, author payment, or external communication occurred.

## Council Review Status

Council Review: Closed.

Implementation: Active.

Next Council Engagement: only upon completion of a major operational milestone, a material architectural decision, an operational blocker requiring executive review, or Jackie request.

## Council Review SharePoint Location

PROGRAM-002 council review files are synced to:

`Implementation HQ / Documents / JM1 Enterprise Architecture / 01_Programs / PROGRAM-002`

Council review index:

`Implementation HQ / Documents / JM1 Enterprise Architecture / 06_Council-Reviews / README-Council-Review-Index.md`
