# Schema Discovery Summary

Live JM1-Core Dataverse read-only discovery was performed before this schema package.

## Discovery Result

| Check | Result |
|---|---|
| Keyword candidate entities reviewed | 146 |
| Existing approved commercial catalog equivalent | NO |
| Disposition | NEW_ENTITY_REQUIRED |
| Production mutation | 0 |

## Relevant Candidates

| Logical name | Entity set | Managed | Row count | Finding |
|---|---|---:|---:|---|
| `jm1pub_edition` | `jm1pub_editions` | false | 0 | Title-edition authority, not commercial SKU/package/service/program catalog authority. |
| `jm1pub_costitem` | `jm1pub_costitems` | false | 0 | Cost item shell only; no Slice 2 authority fields or workflow use. |
| `jm1_titleformat` | `jm1_titleformats` | false | 0 | Title format/output tracking; ISBN, list price, live date, retailer URL, page count, and trim size. |
| `product` | `products` | true | 0 | Managed Dataverse product table; no approved JMP Slice 2 authority mapping. |
| `pricelevel` | `pricelevels` | true | 0 | Managed price list table, not full catalog/ruling authority. |
| `productpricelevel` | `productpricelevels` | true | 0 | Managed price-list item table, not full catalog/ruling authority. |
| `dyn365bc_item_v2_0` | `dyn365bc_items_v2_0` | true | 1 | Business Central mirror, not governing Slice 2 catalog authority. |
| `catalog` | `catalogs` | true | 12 | Managed system catalog, not JMP commercial catalog authority. |

## Repository Authority

The merged commercial catalog code identifies the current hierarchy as:

- Matrix v1.1 approved seed.
- Derived website projection.
- Dataverse operational source pending Slice 2.

The final 120-row catalog register explicitly held Dataverse mutation at 0 and prepared Slice 2 seed input only.

Path B inventory also states Slice 2 Dataverse commercial catalog deployment is required before later target architecture implementation.
