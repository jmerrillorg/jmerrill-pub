# Publishing product catalog live reconciliation

Packet: `JMP-PRODUCT-CATALOG-CANON-RECONCILIATION-001`

## Production readback on 2026-10-01

The live Dataverse commercial catalog contains 120 records: 99 active, 9 superseded, 5 retired, 6 provisional, and 1 internal-only. A repeatable read-only comparison against the August 5 approved 120-row SKU register found no unexplained canonical-SKU or commercial-status drift. CAT-111 and CAT-112 were merged and not seeded; CAT-121 Premier and PF08-AUTH-001 were added. CAT-052 is an intentionally superseded alias of the interactive EPUB3 offer. Thirty-six active records have no fixed `unitprice`; a governed quote or scope determination is required rather than treating null as zero.

The package correction was applied and read back through `scripts/catalog_package_v41_reconcile.mjs`:

| SKU | Live row | State | Base price | Authority |
| --- | --- | --- | ---: | --- |
| `JMP-PKG-STARTER` | CAT-108 | Active, sellable, quotable, contractable | $1,999 | Package Addendum v4.1 |
| `JMP-PKG-PRO` | CAT-106 | Active, sellable, quotable, contractable | $4,500 | Package Addendum v4.1 |
| `JMP-PKG-PREMIER` | CAT-121 | Active, sellable, quotable, contractable | $7,500 | Package Addendum v4.1 |
| `JMP-PKG-SIGNATURE` | CAT-107 | Superseded, not sellable, not quotable, not contractable | Historical $7,500 | Package Addendum v4.1; preserve executed agreements |
| `JMP-PKG-CHILD` | CAT-105 | Active, sellable, quotable, contractable in live August-based catalog | $2,495 | August 5 ruling; later three-tier addendum is silent |

The Children's record is not presented as a fourth standard tier in the successor drafts. Its continuing specialty-offer status requires an explicit commercial ruling. No unapproved retirement or repricing was performed.

## Payment-rule boundary

The internal `paymentPolicyEngine.js` supports contract-bound Full Pay and 2, 4, 8, 12, 18, and 24 payments. New financing v1.1 uses 6% annual simple plan charge prorated to financed months, no compounding, final-cent adjustment, and early payoff without penalty or unearned future charge. Older contracts may select the separately versioned 4% transaction-fee policy. The engine's no-version default remains legacy; callers must bind the agreement's exact policy version rather than infer it from the package or website. Tax is external to the calculator. A 7% Full Pay discount is not approved. Late-payment and final-delivery terms must come from the executed agreement or explicit current policy, not the public catalog.

Public `/packages` payment presentation remains `SUMMARY_ONLY`. No universal installment schedule, financing amount, or 7% Full Pay discount is authorized for public display. The three base package prices remain $1,999, $4,500, and $7,500.

## Successor document state

Two source-backed review drafts were generated from the live Dataverse rows under `Developer/evidence/JMP-PRODUCT-CATALOG-CANON-RECONCILIATION-2026-10-01`. Both were rendered and visually checked. They carry the founder-confirmed **130+ published titles** statement, three standard package prices, actual service statuses, and summary-only public payment language. The old `JMP_Full_Catalog_v2_1.docx` and `JMP_Product_Reference_Guide_v1_1.docx` remain unchanged historical documents. The successor drafts are not yet promoted to current canon while the Children's package remains unresolved.

## QBO product canon handoff

`QBO_UPDATE_STATUS=PAUSED`. The package crosswalk above and the live 120-row status comparison are ready for review. New QBO mapping should select Premier, not historical Signature, for new $7,500 package business; preserve existing transactions and references to Signature. Never create a QBO item from a provisional, retired, superseded, or internal-only record; never infer a fixed price for any of the 36 active records with null unit price. The Children's specialty decision must be bound before a complete product-canon handoff is declared. No QBO mutation occurred in this packet.

`QBO_PRODUCT_CANON_HANDOFF=PARTIAL_PENDING_CHILD_PACKAGE_RULING`

## Independent lifecycle lane

The founder's `/01_Pipeline_A-Z` rule and BYWB history are acknowledged as a separate Publishing lifecycle commissioning lane. This product-catalog packet does not infer Stage 10 or 11 completion, move a title workspace, create V2 lifecycle records, or overwrite the legacy Stage 07 row. Catalog correction and BYWB stage reconciliation must not be conflated.
