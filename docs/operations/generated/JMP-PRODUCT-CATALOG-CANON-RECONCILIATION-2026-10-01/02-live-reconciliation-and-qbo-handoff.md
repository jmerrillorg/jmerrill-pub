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
| `JMP-PKG-CHILD` | CAT-105 | Active, public, sellable, quotable, contractable specialty package | $2,495 | October 1 founder ruling; author supplies production-usable art |

The three core packages are Starter, Professional, and Premier. Children's Book Publishing is separately classified as `SPECIALTY_PUBLISHING`, not a fourth tier. Original illustration creation is not included in its base price and remains separately priced. No retirement or repricing is required.

## Payment-rule boundary

The existing `paymentPolicyEngine.js` implements an earlier simple-charge model; the October 1 founder correction explicitly rejects promoting that model as current payment canon. A prior founder-provided Starter schedule is reproduced numerically by `round(1999 * 1.06^N / N, 2)` for N = 2, 4, 8, 12, 18, and 24, but that arithmetic alone does not establish the charge period, total/final-payment reconciliation, early payoff, tax, late-payment, or final-delivery rules. Do not substitute this inferred formula for a versioned policy or apply it to contracts without exact authority. A 7% Full Pay discount remains unapproved.

Public `/packages` payment presentation remains `SUMMARY_ONLY`. No universal installment schedule, financing amount, or 7% Full Pay discount is authorized for public display. The three base package prices remain $1,999, $4,500, and $7,500.

## Successor document state

The successor generator now separates core and specialty packages, preserves **130+ published titles**, replaces the disputed simple-interest description with a payment-authority boundary, and uses named service families rather than an Uncategorized bucket. The six currently public AI-named offers are classified as intentionally AI-assisted products, not generic internal runtime labels: `JMP-AI-ANALYSIS`, `JMP-AI-COVER`, `JMP-AI-LAUNCH`, `JMP-AI-MARKETING`, `JMP-AI-METADATA`, and `JMP-AI-SENSITIVITY` are `PUBLIC_SELLABLE_AS_NAMED` under the August 5 SKU rulings and current public service descriptions. That classification preserves truthful disclosure of the service characteristic without exposing internal tools or models. The historical `JMP_Full_Catalog_v2_1.docx` and `JMP_Product_Reference_Guide_v1_1.docx` remain unchanged.

## QBO product canon handoff

`QBO_UPDATE_STATUS=PAUSED`. The package crosswalk above and the live 120-row status comparison are ready for handoff. New QBO mapping should select Premier, not historical Signature, for new $7,500 package business; preserve existing transactions and references to Signature. Include `JMP-PKG-CHILD` at $2,495 as active `SPECIALTY_PUBLISHING`, with author-provided art required. Never create a QBO item from a provisional, retired, superseded, or internal-only record; never infer a fixed price for any of the 36 active records with null unit price. No QBO mutation occurred in this packet.

`QBO_PRODUCT_CANON_HANDOFF=PASS` for product identity/status/price mapping; `QBO_UPDATE_STATUS=PAUSED`.

## Independent lifecycle lane

The founder's `/01_Pipeline_A-Z` rule and BYWB history are acknowledged as a separate Publishing lifecycle commissioning lane. This product-catalog packet does not infer Stage 10 or 11 completion, move a title workspace, create V2 lifecycle records, or overwrite the legacy Stage 07 row. Catalog correction and BYWB stage reconciliation must not be conflated.
