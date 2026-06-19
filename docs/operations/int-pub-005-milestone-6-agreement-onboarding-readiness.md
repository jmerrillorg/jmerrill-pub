# INT-PUB-005 Milestone 6 Agreement and Onboarding Readiness

## Purpose

Milestone #6 moves an author from `AUTHOR_RESPONSE_SENT` into governed agreement and onboarding readiness without starting production. It may use the existing Opportunity, record package/path status, prepare agreement/onboarding next steps, prepare Stripe payment-option logic after package selection, notify `publishing@jmerrill.one`, and log safe Dataverse evidence.

Milestone #6 does not start editing, layout, design, ISBN assignment, distribution setup, release setup, royalty setup, Flow D production activation, onboarding automation, or broad production automation.

## Business System Direction

- Dataverse is the operational source of truth.
- Microsoft Business Central / Sales Enterprise is the business, accounting, and sales process layer.
- Stripe is the billing and payment execution source.
- QBO is legacy/retired and must not be used for new Milestone #6 billing, package selection, invoice, payment-option, or tax logic. QBO may be consulted only for historical reference if separately approved.

## Gates

All gates default to `false`:

- `JM1_STRIPE_PAYMENT_OPTIONS_ENABLED=false`
- `JM1_AUTHOR_PAYMENT_LINK_SEND_ENABLED=false`
- `JM1_PUBLISHING_ONBOARDING_ENABLED=false`
- `JM1_OPPORTUNITY_UPDATE_ENABLED=false`
- `JM1_AGREEMENT_PREPARATION_ENABLED=false`

Milestone #6 must not reuse `JM1_AI_EXECUTION_ENABLED`. Diagnostic execution remains a separate Stage 0 gate and must stay closed unless separately authorized.

## Author Communication Model

Milestone #6 separates author-facing communication into stages.

### Stage 1 - Editorial Review and Package Recommendation

The first author-facing response focuses on editorial review, publishing recommendation, suggested package, possible alternative package, and invitation to meet or reply with package preference.

It may include:

1. Warm acknowledgment.
2. Short editorial/readiness summary.
3. Suggested package with package name, short reason, and package cost.
4. Alternative package with package name, short reason, and package cost, unless the suggested package is Starter.
5. Clear next step: schedule a meeting or reply with package preference.
6. Statement that payment/onboarding options will be provided after the author selects a package/path.

It must not include:

- payment plans
- installment breakdowns
- processing fees
- tax calculations
- Stripe checkout links
- invoice/payment mechanics
- contract/payment pressure

### Stage 2 - Package Selection and Stripe Payment Options

Stage 2 is triggered only after the author selects a package or requests payment details.

It may include selected package, Stripe payment options, onboarding form, and agreement/payment next steps. It must not create live Stripe payment links, invoices, subscriptions, installment schedules, or checkout sessions unless Stripe integration, product/price mapping, and the relevant gate are confirmed.

### Stage 3 - Onboarding, Address, Agreement, and Stripe Preparation

After package selection:

1. Ask the author to complete `/author/onboarding`.
2. Collect address and required onboarding data.
3. Prepare agreement and Stripe payment next steps.
4. Use Dataverse / Business Central / Sales Enterprise as business truth.
5. Use Stripe for payment execution.
6. Do not use QBO.
7. Do not send final payment requests without human approval unless a later governed gate explicitly allows it.

## Package Catalog

The package catalog/reference guide is the package source of truth for Milestone #6 recommendation behavior:

| Package Code | Package Name | Cost |
| --- | --- | ---: |
| `JMP-PKG-STARTER` | Starter Publishing Package | `$1,999` |
| `JMP-PKG-PRO` | Professional Publishing Package | `$4,500` |
| `JMP-PKG-SIGNATURE` | Signature Publishing Partnership | `$7,500` |
| `JMP-PKG-CHILD` | Children's Package, author provides art | `$2,495` |

Package recommendation rules:

1. Recommend one primary package.
2. If recommended package is Starter, do not offer a lower alternative.
3. If recommended package is Professional, offer Starter as the alternative.
4. If recommended package is Signature, offer Professional as the alternative.
5. If the project is a children's project with author-supplied illustrations, recommend Children's Package.
6. If the project is a children's project that needs illustrations, flag for human quote/add-on review.
7. Do not recommend pending-partner SKUs.
8. Do not recommend ghostwriting SKUs unless explicitly approved by human review.
9. Do not use `@jmerrill.pub` as an active mailbox.

## Stripe Payment Option Rules

Payment options are Stage 2 only:

- single payment: always available
- 2 payments: always available
- 4 payments: always available
- 8 payments: available if selected package total is at least `$1,000`
- 12 payments: available if selected package total is at least `$2,000`

Card/payment-plan presentations must include a 4% processing fee per transaction. Do not include processing fees or payment plans in the Stage 1 editorial/package recommendation email.

Do not invent Stripe product IDs, price IDs, checkout links, payment links, invoice IDs, subscription IDs, or installment schedules.

## Tax Handling

Do not calculate or display sales tax in Stage 1.

Do not invent tax rates. Because author address is not collected until `/author/onboarding`, tax handling belongs after onboarding data is collected. For publishing package services, treat package prices as service package prices unless governed Stripe / Business Central / Sales Enterprise tax settings determine otherwise.

If tax status cannot be confirmed through governed Stripe / Business Central / Sales Enterprise configuration, mark payment quote as tax pending and do not send final payment terms automatically.

QBO must not be used for tax calculation.

## Current Controlled Record

| Item | Value |
| --- | --- |
| Intake reference | `JMP-INT-202606-UFYG60` |
| Diagnostic ID | `64e387e0-7e6a-f111-a826-00224820105b` |
| Existing Opportunity | `2653fca9-eacd-4c44-b3ed-1764dd5d35aa` |
| Opportunity name | `Publishing Intake - Establishing Glory: The Library` |
| Current Opportunity step | `2-Develop` |

Opportunity handling for this record is update/use existing Opportunity. Do not create a duplicate Opportunity.

## Confirmed Dataverse Coverage

Confirmed tables/entity sets:

| Logical Name | Entity Set | Current Use |
| --- | --- | --- |
| `jm1_publishingintake` | `jm1_publishingintakes` | Governed `/join` intake record |
| `jm1pub_editorialdiagnostic` | `jm1pub_editorialdiagnostics` | Stage 0 diagnostic and review record |
| `opportunity` | `opportunities` | Sales Enterprise Opportunity |
| `jm1_publishingtask` | `jm1_publishingtasks` | Candidate onboarding/action task table |
| `jm1pub_contract` | `jm1pub_contracts` | Candidate publishing contract table |
| `jm1_executionlog` | `jm1_executionlogs` | Safe operational evidence |

Confirmed relevant Opportunity fields:

| Field | Type | Use |
| --- | --- | --- |
| `name` | String | Opportunity name |
| `parentcontactid` | Lookup | Author Contact link |
| `description` | Memo | Safe operational notes |
| `stepname` | String | Sales process step |
| `statuscode` | Status | Status reason |
| `statecode` | State | Active/inactive state |
| `jm1pub_packagerecommended` | String | Candidate package recommendation text |
| `jm1pub_contractstatus` | Picklist | Candidate contract status |
| `jm1pub_contracturl` | String | Candidate contract URL, only after governed contract source exists |
| `jm1pub_intaketrackingid` | String | Intake tracking/reference linkage |
| `jm1pub_projecttitle` | String | Project title |

Confirmed relevant Editorial Diagnostic fields:

| Field | Type | Use |
| --- | --- | --- |
| `jm1pub_recommendedpackage` | Picklist | Candidate diagnostic package recommendation |
| `jm1pub_packageoverride` | Picklist | Human package override |
| `jm1pub_packageoverridereason` | Memo | Safe rationale for override |
| `jm1pub_packagerationale` | Memo | Safe package rationale |
| `jm1pub_packageconfidence` | Picklist | Package recommendation confidence |
| `jm1pub_offerrecommended` | Boolean | Offer recommendation signal |
| `jm1pub_paymentplaneligible` | Boolean | Legacy/candidate payment-plan eligibility flag; not enough for Stripe plan logic |

## Required Field/Rule Gaps

Milestone #6 live-business completion is blocked until these source-of-truth items are confirmed or created:

| Need | Required Governance Decision |
| --- | --- |
| Primary package recommendation | Which table/field is canonical after human review: diagnostic package fields, Opportunity `jm1pub_packagerecommended`, or another catalog-backed field |
| Alternative package | Field or structured safe JSON target for recommended alternative package |
| Author package selection | Canonical table/field for author-selected package/path and selection timestamp |
| Stripe product/price mapping | Governed mapping from package codes to Stripe product and price IDs |
| Stripe payment option preparation | Field/table for prepared payment-option metadata without live checkout/payment link creation |
| Stripe payment handoff status | Field/table for handoff status such as `PAYMENT_OPTIONS_PREPARED`, `PAYMENT_LINK_PENDING_APPROVAL`, `PAYMENT_LINK_SENT` |
| Onboarding status | Canonical field/table for `ONBOARDING_PENDING`, `ONBOARDING_REQUESTED`, `ONBOARDING_RECEIVED` |
| Agreement preparation status | Canonical field/table for `AGREEMENT_PREPARATION_PENDING`, `AGREEMENT_DRAFT_PREPARED`, `AGREEMENT_SENT` |
| Business Central / Sales Enterprise handoff | Whether Opportunity fields are sufficient or a Business Central/Sales Enterprise handoff table/status is required |
| Contract/payment provider approval | Confirmed provider/process for agreement documents and Stripe payment execution |

## Safe Milestone #6 Status Model

Allowed internal statuses:

- `AUTHOR_RESPONSE_SENT`
- `AUTHOR_INTEREST_CONFIRMED`
- `PACKAGE_RECOMMENDATION_PENDING`
- `PACKAGE_RECOMMENDED`
- `PACKAGE_SELECTION_PENDING`
- `PACKAGE_SELECTED`
- `AGREEMENT_PREPARATION_PENDING`
- `ONBOARDING_PENDING`
- `OPPORTUNITY_PREPARED`
- `OPPORTUNITY_UPDATED`
- `AGREEMENT_DRAFT_PREPARED`
- `STRIPE_PAYMENT_OPTIONS_PENDING`
- `STRIPE_PAYMENT_OPTIONS_PREPARED`
- `INVOICE_PREPARATION_PENDING`
- `ONBOARDING_TASKS_PREPARED`

Do not use production-stage statuses such as `PRODUCTION_STARTED`, `FLOW_D_READY`, `DISTRIBUTION_READY`, `BOOK_RELEASE_READY`, or `ROYALTY_READY`.

## Current Readiness Result

Milestone #5 is complete for the controlled record: the approved author response was sent, `publishing@jmerrill.one` had visibility, and safe Dataverse send-log evidence exists.

The follow-on business-source implementation adds the no-side-effect source-layer module in `azure-functions/diagnostic-ai-runner/src/author/milestone6BusinessSourceLayer.js`.

The source layer confirms:

- package recommendation source: `jm1pub_editorialdiagnostic`
- recommended package field: `jm1pub_recommendedpackage`
- package override field: `jm1pub_packageoverride`
- package override reason field: `jm1pub_packageoverridereason`
- package rationale field: `jm1pub_packagerationale`
- business pipeline source: existing `opportunity` row
- Opportunity package text target: `jm1pub_packagerecommended`
- duplicate Opportunity rule: update/use existing active Opportunity only
- package catalog: the governed four-package catalog in this runbook
- Stripe mapping status: required before any live payment option/link action
- Stage 1 email boundary: no payment plans, processing fees, tax, Stripe links, invoice mechanics, or contract/payment pressure
- Stage 2 trigger: only after author package selection or request for payment details
- QBO status: retired legacy, not allowed for new Milestone #6 logic

The source layer proposes these Dataverse targets for schema confirmation:

| Need | Proposed Target | Proposed Logical Name |
| --- | --- | --- |
| Alternative package | `jm1pub_editorialdiagnostic` | `jm1_m6alternatepackagecode` |
| Author-selected package | `opportunity` | `jm1_m6authorselectedpackagecode` |
| Package selection status | `opportunity` | `jm1_m6packageselectionstatus` |
| Stripe product mapping status | `opportunity` | `jm1_m6stripeproductmappingstatus` |
| Stripe price mapping status | `opportunity` | `jm1_m6stripepricemappingstatus` |
| Payment option preparation status | `opportunity` | `jm1_m6paymentoptionpreparationstatus` |
| Agreement preparation status | `opportunity` | `jm1_m6agreementpreparationstatus` |
| Onboarding status | `opportunity` | `jm1_m6onboardingstatus` |
| Opportunity update status | `opportunity` | `jm1_m6opportunityupdatestatus` |
| Business Central / Sales Enterprise handoff status | `opportunity` | `jm1_m6businesshandoffstatus` |

Milestone #6 is not yet live-business complete. The current controlled record has an existing active Opportunity, so duplicate Opportunity creation is not allowed. The next governed step is to confirm or create the proposed package selection, Stripe mapping, onboarding, agreement, and handoff fields before any live agreement/onboarding action.

No production work is authorized by this plan.
