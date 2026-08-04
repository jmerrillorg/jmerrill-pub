# JMP Path B Schema Divergence Inventory

Generated: 2026-08-04

Repository basis: `origin/main` at `b2a4d3e6b50eaba0194352d3a5984efaf7bc747f`

## Boundary

This is a read-only divergence inventory. No Path B target entity was promoted to canon-candidate, implemented, renamed, seeded, priced, deployed, or written to Dataverse.

Mutation boundary:

| Boundary | Result |
|---|---:|
| Schema changes | 0 |
| Table creation | 0 |
| Renames | 0 |
| Dataverse mutations | 0 |
| Catalog mutations | 0 |
| Pricing changes | 0 |
| Deployments | 0 |
| Author communications | 0 |

## Finding

Path B is useful as `TARGET ARCHITECTURE v0.9 / DRAFT`, but it diverges from the approved Publishing schema if its proposed names are treated as new canonical tables.

Current canon already establishes the governing spine:

- `jm1pub_title` as Intellectual Work / Title-Pubs canonical identifier surface.
- `jm1pub_edition` as the approved Title Edition target for real edition instances.
- `jm1pub_publishingasset` as the operational PAM format / edition / ISBN-bearing asset layer already created in JM1-Dev.
- `jm1pub_assetmarketplace` as the operational marketplace/distribution presence layer already created in JM1-Dev.
- `jm1pub_editorialartifact` as the governed editorial/production artifact table for author-visible and internal artifacts.
- `jm1_executionlog` as the execution proof and audit event layer.
- Commercial catalog source projection for packages, product forms `PF-01` through `PF-08`, package slots, product-form attributes, pricing, publishing tracks, and program-only boundaries pending Slice 2 Dataverse promotion.

## Proposed Path B Concept Dispositions

| Path B concept | Required disposition | Reason |
|---|---|---|
| `jm1_titleproductform` | `EXTEND_EXISTING_ENTITY` | The approved equivalent is `jm1pub_edition`, with operational overlap in `jm1pub_publishingasset`. A new table under the Path B name would duplicate title-edition/product-form authority. |
| `jm1_productformattribute` | `NEW_ENTITY_REQUIRED` | Current canon has approved PF attributes in the source projection, but no exact normalized Dataverse entity for reusable PF attribute values exists on `origin/main`. |
| `jm1_releaseplan` | `NEW_ENTITY_REQUIRED` | Release planning is represented only by stage modules, Title Edition fields, and execution events. A governed release-plan record is not yet an approved live equivalent. |
| `jm1_productionmode` | `CONFLICT` | It risks conflating production method with approved `Publishing Track`, package/slot entitlement, PF-07/PF-08 program-only status, and quote/SOW posture. |
| `jm1_artifact` | `CONFLICT` | Generic artifact authority would collide with `jm1pub_editorialartifact`, PAM asset file-reference authority, title-level vs PF-level artifact authority, and SharePoint as file evidence layer. |
| `jm1_distributionjob` | `NEW_ENTITY_REQUIRED` | `jm1pub_assetmarketplace` records distribution presence, and `jm1_executionlog` records lifecycle events; neither is a durable job/work item for submissions, retries, acceptance, or failure handling. |

## Critical Gaps Before Path B v1.0

Path B cannot become canonical until it explicitly preserves:

- `jm1pub_title` and Title-Pubs identifier authority.
- `jm1pub_edition` / edition-level ISBN or distribution identifier authority.
- Publishing Track as payer/funding authority, not SKU identity.
- Package and slot entitlement fields.
- PF attributes including PF-04 narration method, PF-05 complexity, and PF-07/PF-08 program-only gates.
- Editorial Master version.
- Title-level and PF-level artifact authority.
- Release anchor date, distributor submission date, and confirmed-live date.
- Scoping/SOW gate for quote-required work.
- FTL evidence.
- `CORRECTION_AUTHORIZED`.
- Author-facing status projection.
- `jm1_executionlog` event requirements.

## Final Disposition

Path B reframe: `APPROVED`

Classification: `TARGET ARCHITECTURE v0.9 / DRAFT`

Read-only divergence inventory: `COMPLETE`

Full-lifecycle implementation: `NOT AUTHORIZED`

Catalog reconciliation: `CRITICAL-PATH BLOCKER`

Slice 2 deployment: `REQUIRED BEFORE IMPLEMENTATION`

PF-07: `SCHEMA_INERT`

PF-08: `ACTIVE / SCOPING-GATED`

Commissioning portfolio: `TO BE REBUILT OR ACTIVATED ONLY AFTER CURRENT-STATE DEFECTS ARE CLEARED`

Client-title automation: `FROZEN`

Client-title production: `MANUAL`

