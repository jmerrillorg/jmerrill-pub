# PROGRAM-002A Grandfathered Author Activation

**Classification:** Operational activation doctrine
**Status:** Active
**Authority:** Jackie operational authorization - 2026-07-09
**Scope:** JM1-Core relationship-first activation for existing J Merrill Publishing authors

## 1. Purpose

PROGRAM-002A operationalizes existing J Merrill Publishing authors into the relationship-first enterprise model.

Activation occurs relationship-by-relationship.

It does not occur title-by-title as though each legacy book were a new acquisition.

## 2. Governing Principle

The author relationship is the parent.

Titles and publishing assets are children.

Existing catalog titles are grandfathered into the live workspace under that parent relationship.

## 3. What PROGRAM-002A Must Not Require

PROGRAM-002A must not require an existing author to repeat:

- publishing agreement
- onboarding
- intake
- editorial recommendation
- package decision
- financial setup per title

unless Jackie explicitly authorizes one of those actions for a specific relationship or title.

## 4. Relationship Statuses

PROGRAM-002A establishes the following governed relationship statuses for existing catalog authors:

- `Grandfathered`
- `Grandfathered - Activated`

### Meaning

`Grandfathered`

- the relationship is recognized as an existing JMP author relationship
- legacy titles may already be linked or partially linked
- relationship validation is in progress or incomplete

`Grandfathered - Activated`

- the relationship has passed validation
- the workspace is operational
- relationship-level setup is satisfied or truthfully recorded
- existing titles are attached as child assets/projects
- the author can use the workspace without being forced through new-author steps

## 5. Activation Workflow

```text
Relationship
-> Relationship Validation
-> Relationship Activation
-> Attach Existing Titles
-> Validate Workspace
-> Relationship Activated
```

## 6. Relationship Validation Requirements

Validate once per author relationship:

- contact identity
- author profile completeness
- Stripe Connect state
- W-9 / tax state
- payout profile state
- relationship classification/status
- existing title roster
- contract evidence model through `jm1pub_contract`

Unknown data may remain unknown.

Do not invent it.

## 7. Relationship Activation Standard

A relationship is considered activated when:

1. the author resolves as a single governed relationship
2. author-level setup is not duplicated across titles
3. child titles/assets are visible from the relationship workspace
4. each title renders a truthful project state
5. onboarding and financial prompts are suppressed unless genuinely missing at relationship level
6. grandfathered contract evidence is handled through `jm1pub_contract`
7. workspace validation passes without hard errors

## 8. Child Project State Requirements

Each title/asset under the relationship must render truthfully as one of:

- `Pre-Contract Setup`
- `Awaiting Governed Action`
- `Editorial Review`
- `Editorial In Progress`
- `Production In Progress`
- `Distribution / Release Pending`
- `Published / Legacy`
- `Archived`

Grandfathered titles must not be forced into editorial or onboarding simply because they are now visible in the workspace.

## 9. Contract Rule

Contracts remain governed by `jm1pub_contract`.

For grandfathered relationships/titles:

- do not create a new contract solely for platform activation
- do not expose author-facing legal uncertainty when internal evidence exists
- when evidence exists but reconciliation is not yet complete, use internal status:

`Signed / Exists - Location Pending Reconciliation`

## 10. Enterprise Command Metrics

Track at minimum:

- total grandfathered relationships identified
- grandfathered relationships validated
- grandfathered relationships activated
- activation rate
- relationship-level Stripe complete
- relationship-level tax complete
- relationship-level payout complete
- child titles attached
- workspace validations passed
- activation exceptions requiring Jackie

## 11. Operational Success

PROGRAM-002A succeeds when existing J Merrill Publishing authors become fully operational inside the new platform while preserving their publishing history and without duplicating author-level data across titles.
