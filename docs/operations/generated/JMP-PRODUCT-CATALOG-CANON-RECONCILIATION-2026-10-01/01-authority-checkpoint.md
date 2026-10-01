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
- The public `/packages` payment tables used an unsupported 7% full-pay discount and hard-coded installment amounts. The source now presents only the approved base package prices and a payment-options summary. The replacement Full Catalog and Product Reference Guide must not reproduce the old tables, discount, or calculated schedule. They remain historical, not current payment authority.
- Founder-confirmed public portfolio authority is **130+ published titles**, superseding the website's former lower statement. The public catalog API returned **113 title listings** at 2026-10-01T15:17:47Z; that is a **live catalog listing count**, not the total published portfolio. The replacement Full Catalog and Product Reference Guide must carry the 130+ portfolio statement separately from their live listing count when their operational product authority is ready.

## Payment authority boundary

`paymentPolicyEngine.js` contains versioned, deterministic plan calculations. The founder-approved new-contract economics are `JMP_FINANCING_EARLY_PAYOFF_v1.0`: a 6% annual simple plan charge, prorated by financed months, without compounding or early-payoff penalty; unearned future charges are waived. Version `v1.1` extends available terms to Full/2/4/8/12/18/24 Pay without changing those economics. Existing contracts may retain the separately versioned legacy 4% transaction-fee policy. These are contract/snapshot-specific rules, not authority to publish a universal schedule.

| Payment-rule field | Current finding |
| --- | --- |
| Payment plan model | Versioned legacy and new-financing models; select from the governed agreement/pricing snapshot, never website text |
| Interest or finance charge | New model: 6% annual simple plan charge on adjusted principal, prorated by financed months; legacy: separate 4% multi-pay transaction fee |
| Compounding | None in the new model |
| Frequency and available terms | Full Pay or 2/4/8/12/18/24 Pay in v1.1; installments monthly after first payment |
| Rounding | Integer-cent total charge, then nominal installments rounded to cents with the last installment absorbing the remainder |
| Early payoff | No penalty; unearned future charge waived under the new model |
| Full pay | No plan charge in the engine; no current authority found for a 7% discount |
| Late payment | Not established by the reviewed policy sources; agreement/provider terms must govern |
| Final delivery gate | Not established by the reviewed policy sources; do not infer from payment-table copy |
| Tax | External/provider authority; the engine does not calculate tax |

Public payment projection remains `SUMMARY_ONLY`. Do not publish installment amounts or financing claims until the applicable policy version, agreement terms, tax treatment, and calculator output are reconciled and validated for that presentation.

## Release boundary

Do not label replacement DOCX catalogs, a full active-SKU export, QBO handoff, or system product canon as complete until the live package rows and all current service statuses are reconciled. Do not reseed the August 5 register wholesale: its Signature ruling predates the v4.1 addendum and the current founder instruction.
