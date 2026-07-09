# PROGRAM-002A Grandfathered Relationship Activation Plan

**Classification:** Operational activation packet
**Status:** Active
**Authority:** Jackie operational authorization - 2026-07-09
**Program:** PROGRAM-002A - Grandfathered Author Activation

## Purpose

Activate existing catalog authors inside the Author Workspace through a relationship-first model.

The author relationship is the parent record.
Titles, publishing assets, and project states are child records.

## Activation Order

1. Reconcile or create the governed Contact.
2. Confirm relationship classification and status.
3. Assign relationship status = `Grandfathered`.
3. Read relationship-level readiness:
   - author profile
   - Stripe Connect
   - W-9 / tax profile
   - payout profile
4. Reconcile or create child title links.
5. Reconcile or create child publishing asset links.
6. Resolve truthful project state per child title.
7. Read or infer grandfathered contract status from `jm1pub_contract`.
8. Suppress onboarding and financial prompts where the relationship-level setup already satisfies the requirement.
9. Surface child titles in the workspace with truthful, author-safe language.
10. Log the activation movement in governed execution evidence.
11. Set relationship status = `Grandfathered - Activated` when validation passes.

## Relationship-Level Inheritance Rules

- Stripe Connect is inherited from the author relationship.
- W-9 / tax readiness is inherited from the author relationship.
- Payout profile readiness is inherited from the author relationship.
- Author profile and biography readiness are inherited from the author relationship.
- These must not be duplicated per title.

## Child Project State Map

- `Pre-Contract Setup`
- `Awaiting Governed Action`
- `Editorial Review`
- `Editorial In Progress`
- `Production In Progress`
- `Distribution / Release Pending`
- `Published / Legacy`
- `Archived`

## Relationship Statuses

- `Grandfathered`
- `Grandfathered - Activated`

Definitions:

- `Grandfathered`: existing JMP author/title relationship is recognized, but has not yet been fully activated in the platform
- `Grandfathered - Activated`: relationship validated, titles attached, workspace usable, and relationship-level profile/financial requirements resolved or correctly flagged

## Grandfathered Contract Rule

If a grandfathered title has existing agreement evidence but the document location is not yet reconciled:

Internal status:

`Signed / Exists - Location Pending Reconciliation`

This is internal operational truth and should not be surfaced to authors as legal uncertainty.

## Migration Waves

### Wave 1

Known returning authors with multiple linked titles and active relationship evidence.

### Wave 2

Published authors with clean Contact-to-title linkage and existing PAM/title evidence.

### Wave 3

Published authors requiring contract or repository reconciliation but not new business action.

### Wave 4

Legacy/archived authors and titles requiring historical-only visibility.

## Validation Checklist

- no duplicate contact created
- no duplicate title created
- no duplicate publishing asset created
- no relationship-level setup duplicated per title
- no grandfathered title forced through onboarding
- no grandfathered title forced through new agreement flow
- workspace displays truthful child-title status
- contract truth uses `jm1pub_contract`
- author-facing language remains safe and non-alarming
- relationship status promoted from `Grandfathered` to `Grandfathered - Activated` only after workspace validation passes

## Enterprise Command Metrics

- relationships identified
- relationships activated
- relationships remaining
- titles attached
- titles missing repository link
- titles missing marketplace link
- Stripe verified
- W-9 verified
- contract linked
- contract location pending
- workspace validation passed
- exception queue

## Execution Log Events

- `GRANDFATHERED_AUTHOR_ACTIVATION_INITIATED`
- `GRANDFATHERED_CONTACT_RECONCILED`
- `GRANDFATHERED_RELATIONSHIP_RECONCILED`
- `GRANDFATHERED_STRIPE_STATUS_VERIFIED`
- `GRANDFATHERED_W9_STATUS_VERIFIED`
- `GRANDFATHERED_TITLE_LINKED`
- `GRANDFATHERED_PUBLISHING_ASSET_LINKED`
- `GRANDFATHERED_REPOSITORY_LINKED`
- `GRANDFATHERED_MARKETPLACE_LINKED`
- `GRANDFATHERED_WORKSPACE_VALIDATED`
- `GRANDFATHERED_AUTHOR_ACTIVATED`
- `GRANDFATHERED_AUTHOR_EXCEPTION_FLAGGED`

## Jackie Workspace Certification Targets

- `The Intentional Leader` -> `Editorial Review / In Progress`
- `Establishing Glory: The Library` -> truthful non-editorial / legacy-safe state
- `The Long Watch` -> truthful governed waiting state

## Stop Conditions

- conflicting author identity
- conflicting title-to-contact relationship
- destructive merge/delete decision
- contract evidence conflict requiring publisher judgment
