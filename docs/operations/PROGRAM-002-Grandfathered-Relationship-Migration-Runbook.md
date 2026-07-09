# PROGRAM-002 Grandfathered Relationship Migration Runbook

**Classification:** Operational runbook
**Status:** Active
**Authority:** Jackie publisher authorization - 2026-07-09
**Environment:** JM1-Core unless explicitly limited
**Purpose:** Govern the migration of existing J Merrill Publishing authors and back-catalog titles into the relationship-first operating model without treating them as new acquisitions.

## 1. Outcome

Grandfathered Relationship Migration is the governed internal path for bringing existing JMP authors into the live platform as one author relationship with many child publishing assets.

This path is for existing authors and existing catalog history.

It is not the same thing as Midstream Author Seeding.

## 2. Required Separation

Keep these paths distinct:

### Path A - Midstream Author Seeding

Use when a current project is already moving through the active pipeline and must be seeded into Core at its present stage.

### Path B - Grandfathered Relationship Migration

Use when an existing JMP author and their existing catalog are entering the new platform as governed relationship truth.

**Do not mix these paths.**

Do not use the public onboarding form, public intake, or a fresh recommendation cycle to grandfather an existing author unless Jackie explicitly requests it.

## 3. Governing Rules

- The Author Workspace belongs to the author relationship.
- Titles are child publishing assets.
- One author relationship may own many titles.
- Relationship data must not be duplicated across child titles.
- Existing titles are grandfathered unless Jackie explicitly requires a fresh path.
- Manual execution is acceptable; manual truth is not.
- Every migration action must terminate in Core, SharePoint, `jm1_executionlog`, or the governed migration packet.

## 4. What Grandfathered Authors Must Not Repeat

Grandfathered authors must not be required to repeat:

- publishing agreement
- onboarding
- intake
- editorial recommendation
- package selection
- publishing decision

unless Jackie explicitly requests one of those actions for a specific author or title.

## 5. Relationship-Level Data Model

One governed relationship record per author should own:

- Contact identity
- mailing address
- email
- phone
- biography
- website
- social media
- communication preferences
- Stripe Connect state
- W-9 / tax profile status
- royalty payout profile
- relationship classification

Suggested relationship classifications:

- Prospective Author
- Active Author
- Grandfathered Author
- Legacy Author
- Archived

PROGRAM-002A operational activation statuses for existing catalog authors:

- Grandfathered
- Grandfathered - Activated

This information belongs to the relationship layer and must not be duplicated across every title.

## 6. Title-Level Data Model

Each child title / publishing asset keeps its own:

- `jm1pub_title`
- `jm1pub_publishingasset`
- repository package
- editorial stage
- production stage
- metadata
- approvals
- distribution state
- marketplace presence
- royalties
- approval history
- execution log

## 7. Stripe Inheritance Model

Stripe Connect is an author-level capability.

Operational rule:

```text
One author
-> one Stripe relationship
-> many titles inherit it
```

If the relationship-level Stripe Connect state is already valid, child titles should not prompt for duplicate financial setup unless a project-specific action is genuinely required.

## 8. W-9 Inheritance Model

W-9 / tax handling is a relationship-level capability.

Operational rule:

```text
One author
-> one governed tax profile state
-> many titles inherit it
```

Do not collect a separate W-9 state per title unless a future tax/legal policy explicitly requires it.

## 9. Contract Grandfathering Policy

`jm1pub_contract` remains the canonical contract basis.

For grandfathered titles:

- do not request a new publishing agreement solely because the title is entering the platform
- do not fabricate a new contract if only legacy evidence exists
- link historical agreement evidence where available
- where evidence exists but is not yet reconciled, mark truthfully as:
  `Signed / Exists - Location Pending Reconciliation`

## 10. Migration Inputs

Gather these before migrating a grandfathered author:

- author legal/preferred name
- author email
- known Contact ID if present
- phone/address/bio/site/socials if available
- Stripe Connect status if available
- W-9 / tax status if available
- list of governed and legacy titles
- title-to-asset evidence
- repository/workspace evidence
- distribution / marketplace evidence
- contract evidence
- royalty evidence if available

If something is unknown, record it as unknown.
Do not invent it.

## 11. Migration Flow

### Step 1. Reconcile Contact

1. Search existing Core Contact by:
   - contact ID
   - email
   - normalized author name
2. Reuse the existing Contact where confidence is sufficient.
3. Create only if no governed Contact exists.
4. Flag identity ambiguity for Jackie rather than guessing.

### Step 2. Create or reconcile Author Relationship

Establish the governed relationship layer for the author.

Required outputs:
- one author relationship anchor
- relationship classification set truthfully
- workspace ownership anchored to the relationship

### Step 3. Verify relationship-level profile data

Reconcile:

- address
- phone
- bio
- website
- socials
- communication preferences

Populate missing governed data where safe.
Do not duplicate profile records per title.

### Step 4. Verify Stripe Connect

Determine whether the relationship already has a governed Stripe state.

Outcomes:
- verified
- missing
- migration required
- Jackie review required

### Step 5. Verify W-9 / tax profile

Determine whether the relationship already has a governed tax-profile state.

Outcomes:
- verified
- missing
- pending migration
- Jackie review required

### Step 6. Attach all existing titles as child assets

For each known title:

1. reconcile or create `jm1pub_title`
2. reconcile or create `jm1pub_publishingasset`
3. link the asset to the relationship-owned author context

### Step 7. Link SharePoint repositories

For each title/asset:

- reconcile the governed SharePoint package
- record repository references
- do not create duplicate workspaces or duplicate file packages where governed evidence already exists

### Step 8. Link distribution and marketplace records

For each asset:

- reconcile distribution state
- reconcile marketplace presence
- reconcile asset-marketplace links where present

### Step 9. Set current operational stage

Every title must receive a truthful current state, for example:

- Published
- Pre-Production
- Editorial Review
- Awaiting Governed Action
- Legacy / Archive

Do not reset published or legacy titles to onboarding.

### Step 10. Validate workspace

Validate the relationship-first workspace resolves:

```text
Author relationship
-> dashboard
-> projects / titles
-> per-project state
```

Validation targets:
- one author workspace
- many title cards
- relationship-level tasks suppressed when already complete
- each title opens according to its actual state
- no hard failure for a linked but non-editorial title

### Step 11. Write execution-log evidence

Write governed migration evidence for what actually occurred.

Recommended events:

- `GRANDFATHERED_AUTHOR_MIGRATION_INITIATED`
- `GRANDFATHERED_CONTACT_RECONCILED`
- `GRANDFATHERED_RELATIONSHIP_RECONCILED`
- `GRANDFATHERED_STRIPE_STATUS_VERIFIED`
- `GRANDFATHERED_W9_STATUS_VERIFIED`
- `GRANDFATHERED_TITLE_LINKED`
- `GRANDFATHERED_PUBLISHING_ASSET_LINKED`
- `GRANDFATHERED_REPOSITORY_LINKED`
- `GRANDFATHERED_MARKETPLACE_LINKED`
- `GRANDFATHERED_WORKSPACE_VALIDATED`

Use only the events that truthfully occurred.

## 12. Migration Checklist

| Item | Required | Notes |
| --- | --- | --- |
| Contact reconciled | Yes | Reuse before create |
| Author relationship reconciled | Yes | One relationship per author |
| Relationship classification set | Yes | Active / Grandfathered / Legacy / Archived |
| Stripe status verified | Yes | Relationship-level only |
| W-9 status verified | Yes | Relationship-level only |
| Existing titles attached | Yes | Child assets under relationship |
| `jm1pub_title` reconciled | Yes | Per title |
| `jm1pub_publishingasset` reconciled | Yes | Per title |
| Repository references linked | Yes | Reuse before create |
| Distribution / marketplace records linked | Conditional | When evidence exists |
| Current title state set | Yes | Truthful current stage only |
| Workspace validated | Yes | Mixed-state projects must render safely |
| Execution-log evidence written | Yes | Manual truth not allowed |

## 13. Operational Validation Plan

A grandfathered author migration is not complete until:

1. one author relationship resolves cleanly
2. shared profile and financial state are not duplicated across titles
3. all intended titles appear as child projects/assets
4. each title shows its real state
5. onboarding is not re-triggered unless genuinely missing at relationship level
6. contract state is not falsely shown as missing for legitimate legacy titles
7. no duplicate contacts, Stripe profiles, W-9 states, or biographies are created

## 14. Enterprise Command Migration Dashboard Metrics

Track at minimum:

- total existing authors identified
- total grandfathered relationships identified
- authors migrated
- authors remaining
- grandfathered relationships validated
- grandfathered relationships activated
- grandfathered relationship activation rate
- relationship-level Stripe verified
- relationship-level W-9 verified
- titles linked as child assets
- titles missing repository evidence
- titles missing marketplace evidence
- contracts linked
- contracts pending reconciliation
- workspace validations passed
- migration exceptions requiring Jackie

## 15. Execution Record Template

Use this structure when reporting a migrated grandfathered author:

- Contact reconciled/created:
- Relationship reconciled/created:
- Relationship classification:
- Stripe verified/missing:
- W-9 verified/missing:
- Titles linked:
- Publishing assets linked:
- SharePoint package/repository references:
- Marketplace/distribution links:
- Workspace validation result:
- Execution-log events written:
- Remaining unresolved items:
