# JMP Commercial Catalog Schema Specification

Generated: 2026-08-05

Repository basis: `origin/main` at `47ad0e07e0ae41a849edab77f42292304772de43`

## Executive Ruling

Disposition: `NEW_ENTITY_REQUIRED`

Approved concept: JMP commercial catalog item authority

Canonical logical name: `jm1pub_commercialcatalogitem`

Display name: `JMP Commercial Catalog Item`

Expected entity set: `jm1pub_commercialcatalogitems`

Solution: `JM1 Publishing Commercial Catalog`

Client-title automation: `FROZEN`

## Boundary

This package is a schema review package only.

| Boundary | Result |
|---|---:|
| Dataverse table creation | 0 |
| Dataverse column creation | 0 |
| Dataverse solution deployment | 0 |
| Catalog mutation | 0 |
| Business Central mutation | 0 |
| Public website change | 0 |
| Author communication | 0 |
| Executor retargeting | HELD |

## Finding

The protected Slice 2 executor is deployed, but the prior production dry-run proved its guessed entity set is not currently present in live Dataverse. Read-only schema discovery did not find an approved commercial-catalog equivalent that can safely hold the approved 120-row ruling authority.

The existing candidates have different authority:

| Entity | Finding |
|---|---|
| `jm1pub_edition` | Title-edition authority, not commercial SKU/package/service/program authority. |
| `jm1pub_costitem` | Cost item shell; no Slice 2 authority fields or workflow use. |
| `jm1_titleformat` | Title format/output tracking, not catalog ruling authority. |
| `product`, `pricelevel`, `productpricelevel` | Managed Dataverse product/pricing tables; no approved JMP Slice 2 authority mapping. |
| `dyn365bc_item_v2_0` | Business Central mirror, not governing commercial catalog authority. |
| `catalog` | Managed system catalog, not JMP commercial catalog authority. |

## Required Disposition

Provision a new canonical Dataverse entity through a governed solution only after human review.

Do not manually create the table in production.

Do not hard-code the expected entity set as verified. The entity set must be read from live metadata after solution deployment, then the Slice 2 executor may be retargeted or confirmed against the verified value.

## Next Governed Action

Human review and approval of this schema solution package, followed by governed development-environment provisioning, solution export/validation, governed deployment, live metadata readback, executor retargeting, protected dry-run, and only then the one-time Slice 2 mutation.
