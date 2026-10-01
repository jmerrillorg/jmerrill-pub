# Product catalog canon reconciliation: authority checkpoint

Packet: `JMP-PRODUCT-CATALOG-CANON-RECONCILIATION-001`  
Status: In flight; not a replacement catalog or a QBO import.  
Effective-date target: 2026-10-01.

## Controlling package authority

The founder's current instruction and the governed package addendum v4.1 supersede the May catalog and the August 5 catalog register where they disagree. Current public package authority is:

| Package | SKU | Base price (USD) | Edition slots | Audiobook rule |
| --- | --- | ---: | ---: | --- |
| Starter Publishing Package | `JMP-PKG-STARTER` | 1,999 | 2 | Separate line item |
| Professional Publishing Package | `JMP-PKG-PRO` | 4,500 | 3 | Separate line item |
| Premier Publishing Package | `JMP-PKG-PREMIER` | 7,500 | 4 | AI narration included under the governed 8-PFH policy; human narration quoted separately |

`JM Signature` is an imprint and selective publishing identity, not a package SKU. `JM Prestige` is a distinct selective path. Historical agreements retain their original evidence; no new agreement or quote may be created under the superseded Signature package.

## Supersession register

| Old name | Old SKU | Current name | Current SKU | Effective date | Reason | Migration rule |
| --- | --- | --- | --- | --- | --- | --- |
| Signature Publishing Partnership | `JMP-PKG-SIGNATURE` | Premier Publishing Package | `JMP-PKG-PREMIER` | 2026-08-12 addendum v4.1; reaffirmed 2026-10-01 | Separate the $7,500 hybrid package from the JM Signature imprint | Preserve historical records; block new Signature quotes/contracts; use Premier for new package selection without rewriting executed agreements |

## Readback and open reconciliation

- `lib/commercial/catalog.ts` and the current v4.1 addendum agree on the three package SKUs, prices, slots, and audiobook policies.
- Public package cards use Starter, Professional, and Premier. The homepage Pathfinder previously said Signature; the source correction and regression guard are in this packet, not yet deployed.
- The current Dataverse commercial catalog readback had 119 rows. `CAT-107` (`JMP-PKG-SIGNATURE`) remained `ACTIVE`, `QUOTABLE`, and `CONTRACTABLE` while `NOT_SELLABLE`; `JMP-PKG-PREMIER` was absent. `CAT-105` (`JMP-PKG-CHILD`) remained an active, sellable package. These rows require controlled source-authority and historical-transaction reconciliation before the operational catalog can be declared aligned.
- Starter and Professional operational rows retain fixed word-limit names and quoted-price fields inconsistent with the current edition-slot presentation. Current commercial terms must govern any correction; do not infer a new price or rewrite an executed contract.
- The old Full Catalog v2.1 and Product Reference Guide v1.1 remain historical. Neither is promoted as current service/SKU authority by this checkpoint. Their broad service rows require current sellability, scope, price, and human-first naming review before a replacement guide or complete QBO handoff is issued.
- The old Full Catalog's 101-title statement and the website's frozen 125+ statement do not establish a current published-title total. The public catalog projection returned 113 title records at readback, but that is a **catalog listing count**, not proof that 113 titles are published. The website changes in this packet use live catalog counts only as catalog counts.

## Release boundary

Do not label replacement DOCX catalogs, a full active-SKU export, QBO handoff, or system product canon as complete until the live package rows and all current service statuses are reconciled. Do not reseed the August 5 register wholesale: its Signature ruling predates the v4.1 addendum and the current founder instruction.
