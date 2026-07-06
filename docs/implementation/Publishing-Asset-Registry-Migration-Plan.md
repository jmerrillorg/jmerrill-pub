# Publishing Asset Registry Migration Plan

**Program:** EOP-001 - Enterprise Optimization  
**Scope:** Source-of-truth and migration planning only  
**Status:** Draft migration plan; no Dataverse or file movement performed  
**Date:** 2026-07-06  

## Executive Summary

The migration authority for the Publishing Asset Registry should be `MONTHLY REPORTING 2026(1).xlsx`, not `books.json`. The workbook manually connects ISBNs, authors, marketplace aliases, sales channels, formats, ASIN/ISBN identifiers, ACX names, reporting dates, fees, royalties, and author-copy/shipping calculations. That intelligence should be preserved through a governed Dataverse migration.

`books.json` remains website legacy evidence only. It may be used for comparison after governed sources are staged, but it must not govern author/title identity, ISBN assignment, royalties, contracts, or Enterprise Health.

## 1. Workbook Source Map

| Sheet | Rows | Cols | Purpose | Key Columns |
| --- | --- | --- | --- | --- |
| ISBN | 411 | 14 | Canonical migration blueprint for ISBN/formats/status/list price/cost/contract/house flags inside the workbook. | ISBN13, Title, Format, Status, ISBN, KINDLE, Published, List Price, Cost, 0.4, New , AUTHOR COPY |
| AUTHOR | 93 | 5 | Alias bridge mapping POD, eBook, Amazon, and ACX names to MasterName. | POD, eBook, Amazon, ACX, MasterName |
| DATES | 108 | 5 | Reporting-period control table for POD/eBook/Amazon/ACX/MasterDate. | PODDate, eBookDate, AmazonDate, ACX, MasterDate |
| POD | 32073 | 95 | Ingram POD sales/print-charge/reporting rows. | publisher_number, publisher_name, isbn, sku, Full ISBN, Title, author, page_count, binding_type, book_type_id, List Price (USD), wholesale_discount_% |
| LINK | 789 | 27 | Link/share-and-sell POD rows; channel-specific sales rows. | publisher_number, publisher_name, link_name, isbn, sku, parent_isbn, title, author, page_count, binding_type, book_type_id, quantity_sold |
| EBOOK | 995 | 80 | eBook distributor sales rows with marketplace/subagent/product IDs. | ReportID, ReportDateTime, MessageFunction, SalesReportType, ReportPeriodFrom, ReportPeriodTo, ReportDate, ReportingPriceType, ReportingCurrency, ClassOfTrade/Sale, SalesTerritory, LineItemID# |
| AMAZON | 2992 | 28 | KDP/Amazon sales rows with ASIN/ISBN, marketplace, royalty, fees, and author mapping. | Title, Author, ASIN/ISBN, Marketplace, Units Sold, Units Refunded, Net Quantity Sold, Discount (%), Payout Plan, Currency, List Price (USD), Avg. Offer Price without tax |
| ACX | 739 | 21 | Audiobook royalty rows with Product ID, Digital ISBN, royalty earner, and unit/royalty measures. | Date, Royalty Earner, Product ID, Author, Title, Digital ISBN, Net Units AL, Net Royalties Earned AL, Net Units ALOP, Net Royalties Earned ALOP, Net Units ALC, Net Royalties Earned ALC |
| POD-Report | 64 | 9 | Workbook reporting/pivot summary for POD. | MasterDate, (Multiple Items), Unnamed: 2, Unnamed: 3, Unnamed: 4, Unnamed: 5, Unnamed: 6, Unnamed: 7, Unnamed: 8 |
| EBOOK-Report | 17 | 10 | Workbook reporting/pivot summary for eBook. | MasterDate, (Multiple Items), Unnamed: 2, Unnamed: 3, Unnamed: 4, Unnamed: 5, Unnamed: 6, Unnamed: 7, Unnamed: 8, Unnamed: 9 |
| AMAZON-Report | 5 | 9 | Workbook reporting/pivot summary for Amazon/KDP. | MasterDate, 2026-04-01 00:00:00, Unnamed: 2, Unnamed: 3, Unnamed: 4, Unnamed: 5, Unnamed: 6, Unnamed: 7, Unnamed: 8 |
| ACX-Report | 4 | 5 | Workbook reporting/pivot summary for ACX. | Date, 2026-04-01 00:00:00, Unnamed: 2, Unnamed: 3, Unnamed: 4 |
| Shipping | 16 | 22 | Author copy/shipping/pricing calculation layer. | Order Qty,  Original ,  Adjustment ,  Service Level ,  Extended Amount ,  Profit , Unnamed: 6, Unnamed: 7, Payment Options, Unnamed: 9, Unnamed: 10, Payment Options.1 |

## Supporting Source Files

| File | Rows | Purpose |
| --- | --- | --- |
| Total_Asset_Listing_20260706_0831.xlsx | 260 | CoreSource asset listing |
| IS report.csv | 233 | Ingram/LSI publisher/distribution proof report |
| LSI report.csv | 5 | Ingram/LSI publisher/distribution proof report |
| prefix-9781950719.csv | 100 | Bowker ISBN prefix inventory; assigned 100, available 0 |
| prefix-9781954414.csv | 100 | Bowker ISBN prefix inventory; assigned 100, available 0 |
| prefix-9781961475.csv | 100 | Bowker ISBN prefix inventory; assigned 84, available 16 |
| prefix-9781969418.csv | 100 | Bowker ISBN prefix inventory; assigned 0, available 100 |

## 2. Proposed Dataverse Tables

| Table | Purpose | Core Fields |
| --- | --- | --- |
| Publishing Asset | Asset-level registry for each title/format/identifier combination | asset id, title, subtitle, format, ISBN13, normalized ISBN, status, imprint, list price, cost, pub/street dates, source confidence |
| Author / Contact | Canonical party record; Dataverse Contact remains party master | contact id, legal/display name, email if known, author status, workspace mode, identity confidence |
| Author Marketplace Alias | Maps provider-specific names to Contact | contact, source channel, alias text, normalized alias, first seen, confidence, review status |
| Marketplace Identifier | Stores ASIN, ACX Product ID, Ingram SKU, CoreSource title code, ISBN variants | asset, channel, identifier type, identifier value, status, source file |
| Sales Import Row | Raw normalized staging row from POD/eBook/Amazon/ACX/shipping reports | source file, channel, period, ISBN/identifier, units, gross, fees, royalty, row hash |
| Royalty Rule | Defines author/title royalty calculation terms | contact, title/asset, channel, rate, fee policy, effective dates, contract reference |
| Royalty Statement | Statement header by author/period | contact, period, status, total sales, total royalty, payment status |
| Royalty Line | Statement detail derived from sales rows | statement, sales row, title/asset, units, net, royalty amount, adjustments |
| Distribution Channel | Canonical sales/reporting channel reference | channel code, provider, source sheet/file, active status |
| Shipping / Author Copy Charge | Author-copy, shipping, wholesale and fulfillment charges | author/contact, order qty, service level, price, discount, fees, profit, period |

## 3. Canonical Relationships

| Relationship | Canonical Rule |
| --- | --- |
| ISBN -> Title/Format | Publishing Asset uses ISBN13 + format as the unique title-format identity; Bowker validates prefix assignment. |
| Title -> Author(s) | Dataverse `jm1pub_title.jm1_primaryauthor` -> Contact should be canonical; marketplace aliases only corroborate. |
| Author -> Marketplace Aliases | AUTHOR sheet provides POD/eBook/Amazon/ACX alias bridge to MasterName; migrate into Author Marketplace Alias. |
| Title -> ASIN / ACX / Ingram / LSI IDs | Marketplace Identifier links each provider identifier to Publishing Asset. |
| Title -> Imprint | Dataverse title imprint should be canonical after publisher certification; workbook/support files become evidence. |
| Title -> Contract | Link title/asset to `jm1pub_contract` where present; legacy contract file location remains reconciliation evidence. |
| Title -> Royalty Rule | Royalty Rule references title/asset, Contact, channel, and contract. |
| Sales row -> title/ISBN/channel | Sales Import Row resolves through ISBN/marketplace identifier and Distribution Channel. |
| Royalty line -> sales row/title/author | Royalty Line is derived from Sales Import Row + Royalty Rule and references statement/contact. |

## 4. Source-of-Truth Rule

| Priority | Source | Role |
| --- | --- | --- |
| 1 | MONTHLY REPORTING 2026(1).xlsx | Migration blueprint for current manual operational intelligence: ISBNs, aliases, sales channels, reporting relationships, fees, and calculations. |
| 2 | Dataverse | Future system of record after migration; Contact remains party master and `jm1pub_title`/Publishing Asset carry title-format identity. |
| 3 | Bowker prefix CSVs | Publisher ISBN assignment proof. |
| 4 | IS report.csv / LSI report.csv / Total Asset Listing | Publisher/distribution proof for title metadata, ISBNs, contributor names, channels, and asset status. |
| 5 | SharePoint/backlist folders | File evidence and historical project folders; not identity authority. |
| 6 | books.json | Website legacy evidence only; never governing source. |

## 5. Backlist Consolidation Plan

Do not move files yet. The backlist consolidation should happen only after Publishing Asset, Contact, contract, and workspace identifiers exist in Dataverse.

| Location | Observed Finding | Consolidation Plan |
| --- | --- | --- |
| /Volumes/UsersExternal/Olympus/backup/mini (r)/Merge/Publishing/File Cabinet/01 JMerrillPub/00 Books - Projects/10 BACKLIST | Legacy backlist file cabinet; 61 top-level items observed | Inventory only; do not move. Map folders to Publishing Asset/Contact candidates after registry staging. |
| /Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/JM1-PUB/Archive/Active Projects | Archived active-project phase folders; 12 top-level items observed | Treat as historical project-stage evidence, not current workspace authority. |
| /Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/JM1-PUB/01_Pre-Pipeline/_Projects/01. Lead Intake | Lead intake project folders; 29 top-level items observed | Separate active/prospect intake from published backlist. |
| /Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/JM1-PUB/01_Pre-Pipeline | Current pre-pipeline stage folders; 9 top-level items observed | Do not merge with backlist until stage/status is validated. |

Recommended consolidation sequence:

1. Create read-only inventory of each location with folder path, normalized title candidate, normalized author candidate, file counts, and last modified date.
2. Match folders to Publishing Asset candidates using ISBN/title/author evidence from the workbook and distribution reports.
3. Flag ambiguous folders for manual review.
4. Create a Dataverse file evidence record or SharePoint evidence pointer before any move.
5. Only after Jackie approves, move/link files into the PROGRAM-002 workspace model without duplicating or deleting originals.

## 6. Data Quality Report

| Check | Count | Notes |
| --- | --- | --- |
| Workbook sheets profiled | 13 | All monthly workbook sheets mapped. |
| Support files profiled | 7 | Includes asset listing, IS/LSI reports, Bowker prefixes. |
| Normalized identifier-bearing rows | 2369 | Rows with ISBN/ASIN/Product-ID-like values across sources. |
| Unique normalized identifiers | 625 | Candidate identifier universe for staging. |
| Identifiers appearing in multiple sources | 412 | Expected where ISBNs appear in workbook + Bowker + distribution reports; use for matching, not automatic duplicate deletion. |
| Identifier/title conflicts | 132 | Requires staging review because some provider exports have subtitles, alternate titles, or parsing quirks. |
| Author alias conflicts | 0 | No alias mapping conflicts detected in AUTHOR sheet profile. |
| Legacy website catalog ISBNs not in workbook ISBN sheet | 0 | Legacy comparison only; books.json is not authority. |
| Workbook ISBN sheet identifiers not in legacy website catalog | 289 | Shows why workbook is richer than website catalog evidence. |

Requested quality categories:

| Category | Finding | Migration Handling |
| --- | --- | --- |
| Duplicate titles | 154 duplicate normalized title names in the workbook ISBN sheet | Expected where a title has multiple formats or editions. Resolve through title + format + ISBN, not title text alone. |
| Duplicate ISBNs | 0 duplicate ISBN13 values inside the workbook ISBN sheet | Good registry signal. Cross-source repeats are proof matches, not duplicate registry rows. |
| Missing ISBNs | 0 missing ISBN13 values inside the workbook ISBN sheet | ISBN sheet can seed the ISBN registry after staging validation. |
| Missing authors | AUTHOR alias sheet has 93 rows; provider transaction sheets have many blank author cells: POD 31,880, LINK 788, AMAZON 2,988, ACX 735 | Do not infer Contact solely from sales rows. Use AUTHOR alias bridge plus Dataverse Contact matching. |
| Author alias conflicts | 0 duplicate alias-to-different-MasterName conflicts detected in AUTHOR sheet profile | Treat AUTHOR sheet as a strong alias migration bridge, still subject to Contact validation. |
| Title/author mismatches | Not fully governable from the source files alone | Requires staging table that can compare workbook AUTHOR aliases, Dataverse Contacts, contracts, and title records. |
| Missing formats | 140 workbook ISBN rows missing Format | Must be repaired before asset-level uniqueness can be certified. |
| Missing imprints | IS report.csv and LSI report.csv show 0 missing imprint rows in this profile | Imprint values are evidence; PROGRAM-002 certified imprint remains authority after publisher certification. |
| Missing marketplace identifiers | Amazon rows with title have 0 missing ASIN/ISBN; ACX rows with title have 0 missing Product ID and 4 missing Digital ISBN | Preserve ASIN/Product ID as provider identifiers; flag ACX Digital ISBN gaps for review. |
| Titles in reports but not workbook ISBN registry | 59 normalized report titles | Stage as registry gap candidates; do not create titles automatically until ISBN/identifier evidence is reconciled. |
| Titles in workbook ISBN registry but not reports | 17 normalized workbook titles | Stage as non-selling/inactive/unreported candidates pending status validation. |

Key data-quality issues:

- Duplicate ISBN appearances across sources are mostly expected and useful for matching; they are not deletion candidates.
- 132 identifier/title conflicts require staging review. Many likely come from provider title variants, subtitles, escaped CSV parsing, or ISBN-to-format differences.
- Workbook ISBN registry has 411 rows and Bowker prefix evidence has 400 rows. Prefix `9781969418` is currently fully available in the observed CSV.
- AUTHOR alias sheet showed no duplicate alias-to-MasterName conflicts in this profile, making it a strong migration bridge for marketplace aliases.
- The legacy website catalog comparison shows 289 workbook ISBN registry identifiers not present in the legacy website catalog, confirming that the workbook is richer than the website catalog.
- `books.json` was used only as a non-authoritative website comparison signal in the generated profile. It does not govern the migration.

## 7. Migration Recommendation

### Migration Order

1. Stage source files exactly as received with file hash, source path, sheet/file name, import timestamp, and row count.
2. Load Bowker prefixes into a `Publishing Asset Identifier Staging` table.
3. Load workbook `ISBN` rows as the initial Publishing Asset registry seed.
4. Load workbook `AUTHOR` rows into Author Marketplace Alias staging.
5. Load Total Asset Listing, IS, and LSI rows as distribution proof staging.
6. Load POD, LINK, EBOOK, AMAZON, ACX, and Shipping rows into Sales Import Row staging.
7. Resolve Publishing Asset by ISBN/format/channel identifiers.
8. Resolve Contact by governed Dataverse Contact matching, not by workbook text alone.
9. Create/update Marketplace Identifier rows for ASIN, ACX Product ID, Ingram SKU, LSI SKU, CoreSource title code, and ISBN variants.
10. Link assets to contracts/royalty rules only after contract evidence is reconciled.
11. Recalculate Enterprise Health metrics from Dataverse, not source files.

### Fields To Create / Confirm

- Publishing Asset: ISBN13, normalized ISBN, title, subtitle, format, status, list price, cost, imprint, publication dates, source status, distribution status.
- Contact: canonical author identity, display/legal name, workspace mode, author status, Stripe migration status, royalty readiness status.
- Author Marketplace Alias: source channel, alias, normalized alias, mapped Contact, confidence, review status.
- Marketplace Identifier: identifier type, identifier value, channel, source file, active status, linked Publishing Asset.
- Sales Import Row: source, period, channel, identifier, units, gross, fees, royalty amount, row hash, import status.
- Royalty Rule/Statement/Line: defer until contract and royalty terms are reconciled.

### Risks

- UTF-16 provider CSVs must be parsed through a staging parser; do not treat raw CSV rows as clean without import QA.
- ISBN/title conflicts require review before automated linking.
- Author aliases can be stable but still require Contact validation.
- Backlist folders may use legacy author/title naming conventions that differ from reporting sources.
- Contract reconciliation is required before royalty automation.

### Jackie-Only Blockers

- Approval of canonical Dataverse table names and whether to extend `jm1pub_title` or create a separate Publishing Asset table for title-format granularity.
- Approval of author identity matching rules where Contact ambiguity exists.
- Approval before any backlist/SharePoint file movement.
- Approval before royalty rule migration and live royalty automation.
- Approval before retiring any legacy payment or royalty process.

## 8. Current Boundaries Preserved

- No Dataverse modifications.
- No SharePoint/backlist file moves.
- No `books.json` updates.
- No OP-000 adoption changes.
- No royalty or payment activity.
