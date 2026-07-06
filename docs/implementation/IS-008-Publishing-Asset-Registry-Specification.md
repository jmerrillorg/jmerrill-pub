# IS-008 - Publishing Asset Registry Specification

**Program:** PAM-001 - Publishing Asset Management  
**Status:** Draft implementation specification; do not deploy schema yet  
**Authority:** Jackie-approved PAM-001 architecture correction, 2026-07-06  
**Scope:** Dataverse schema specification for Publishing Asset Registry only  
**Boundaries:** No Dataverse modification, no file movement, no royalty/payment activity

## 1. Purpose

This specification defines the Dataverse schema needed to make the Publishing Asset Registry governable.

The registry separates:

- Contact as person / party master
- `jm1pub_contract` as agreement / contract basis
- `jm1pub_title` as Intellectual Work
- `jm1pub_publishingasset` as format / edition / ISBN asset
- `jm1pub_assetmarketplace` as marketplace/distribution presence

This specification is intentionally separate from IS-001. PAM adds a missing asset layer; it does not reinterpret the enterprise foundation model.

## 2. Source Authority

| Source | Role |
| --- | --- |
| `MONTHLY REPORTING 2026(1).xlsx` | Migration blueprint for ISBNs, authors, aliases, channels, formats, ASINs, ACX names, and reporting relationships |
| Bowker prefix CSVs | ISBN assignment proof |
| IS report.csv / LSI report.csv | Ingram/LSI distribution proof |
| Total_Asset_Listing_20260706_0831.xlsx | CoreSource / asset-listing proof |
| Dataverse | Future system of record after migration |
| SharePoint | Governed file evidence layer |
| `books.json` | Website legacy evidence only; never governing authority |

## 3. Schema Table List

### Existing Tables Reused

| Table | Canonical Use |
| --- | --- |
| Contact | Person / party master |
| `jm1pub_contract` | Merged publishing agreement / contract basis |
| `jm1pub_title` | Intellectual Work |
| `jm1_executionlog` | Proof and audit event layer |

### New Tables Proposed

| Table | Purpose |
| --- | --- |
| `jm1pub_publishingasset` | Format / edition / ISBN-bearing asset |
| `jm1pub_assetmarketplace` | Marketplace/distribution presence per asset |

### Future/Deferred Tables

These are identified by the migration plan but should not be built in this specification unless Jackie separately authorizes royalty/import implementation:

| Table | Status |
| --- | --- |
| Sales Import Row | Deferred to royalty/import workstream |
| Royalty Rule | Existing/planned royalty domain; not created here |
| Royalty Statement | Deferred |
| Royalty Line | Deferred |
| Shipping / Author Copy Charge | Deferred |
| Author Marketplace Alias | Recommended staging/support table; build timing pending Contact matching design |
| Marketplace Identifier | Can be separate table later if `jm1pub_assetmarketplace` becomes too broad; not required for first PAM build |

## 4. Existing Table Extensions

### 4.1 Contact

No required field changes in this specification.

Contact remains the party master. PAM should link through existing title/contract relationships and future governed Contact matching.

### 4.2 `jm1pub_contract`

No required field changes in this specification.

PAM uses `jm1pub_contract` as the contract basis. Historical contracts should be linked through existing or future contract reconciliation fields.

### 4.3 `jm1pub_title`

Confirm or add only if missing:

| Field | Type | Purpose |
| --- | --- | --- |
| `jm1pub_certifiedimprint` | Lookup/choice | PROGRAM-002 certified imprint, separate from historical published imprint if needed |
| `jm1pub_assetregistrystatus` | Choice | Not Started / Staged / Partially Reconciled / Reconciled / Exception |
| `jm1pub_assetregistrylastverifiedon` | DateTime | Last registry verification timestamp |

If equivalent fields already exist, reuse them and do not create duplicates.

## 5. New Table: `jm1pub_publishingasset`

### 5.1 Purpose

One record per format / edition / ISBN-bearing asset belonging to a `jm1pub_title`.

### 5.2 Primary Relationships

| Relationship | Required | Notes |
| --- | --- | --- |
| `jm1pub_titleid` -> `jm1pub_title` | Yes | Parent intellectual work |
| `jm1pub_contractid` -> `jm1pub_contract` | No at initial staging | Link when contract reconciliation is available |
| Owner | Standard | Business owner/team |

### 5.3 Recommended Fields

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| `jm1pub_name` | Text | Yes | Human-readable asset label |
| `jm1pub_titleid` | Lookup | Yes | Parent `jm1pub_title` |
| `jm1pub_assetformat` | Choice | Yes | Paperback / Hardcover / eBook / Audiobook / Large Print / Workbook / Other |
| `jm1pub_editionlabel` | Text | No | First edition, Revised, Second Edition, etc. |
| `jm1pub_iscurrentedition` | Boolean | No | Current edition flag |
| `jm1pub_isbn13` | Text | No | ISBN-13 assigned to this format |
| `jm1pub_normalizedisbn` | Text | No | Digits-only ISBN key |
| `jm1pub_asin` | Text | No | Amazon ASIN where applicable |
| `jm1pub_acxproductid` | Text | No | ACX product identifier |
| `jm1pub_lsiid` | Text | No | LSI/Ingram identifier |
| `jm1pub_coresourceid` | Text | No | CoreSource identifier |
| `jm1pub_publicationdate` | Date | No | Published/released date for this asset |
| `jm1pub_retailprice` | Currency | No | List price |
| `jm1pub_currency` | Text/Choice | No | ISO 4217 currency, default USD |
| `jm1pub_tradediscount` | Decimal | No | Trade discount percentage |
| `jm1pub_returnable` | Boolean | No | Returnability flag |
| `jm1pub_distributionstatus` | Choice | No | Draft / Active / Suspended / Retired / Unknown |
| `jm1pub_assetstatus` | Choice | No | Staged / In Production / Live / Backlist / Retired / Exception |
| `jm1pub_metadatastatus` | Choice | No | Incomplete / Complete / Verified / Exception |
| `jm1pub_filepackagereference` | URL/Text | No | SharePoint file package reference |
| `jm1pub_coverfilereference` | URL/Text | No | SharePoint final cover reference |
| `jm1pub_interiorfilereference` | URL/Text | No | SharePoint final interior reference |
| `jm1pub_audiofilereference` | URL/Text | No | SharePoint final audio/source reference |
| `jm1pub_evidencesource` | Text/Choice | No | Workbook, Bowker, Ingram, CoreSource, SharePoint, manual review |
| `jm1pub_evidencepath` | URL/Text | No | Evidence file/folder URL |
| `jm1pub_lastverifiedon` | DateTime | No | Last Verified discipline |
| `jm1pub_assethealthscore` | Whole Number | No | 0-100 health score |
| `jm1pub_assethealthstatus` | Choice | No | Healthy / Needs Review / Incomplete / Blocked |
| `jm1pub_exceptionreason` | Multiline Text | No | Exception note |

### 5.4 Alternate Keys

Recommended alternate keys:

| Key | Fields | Notes |
| --- | --- | --- |
| `AK_jm1pub_publishingasset_isbn13` | `jm1pub_normalizedisbn` | Use only where ISBN is present and unique |
| `AK_jm1pub_publishingasset_title_format_edition` | `jm1pub_titleid`, `jm1pub_assetformat`, `jm1pub_editionlabel` | Requires careful handling for multiple ISBN variants |

If Dataverse alternate-key constraints conflict with nullable fields, implement duplicate detection rules instead of unsafe alternate keys.

## 6. New Table: `jm1pub_assetmarketplace`

### 6.1 Purpose

One record per marketplace/distribution presence for a `jm1pub_publishingasset`.

### 6.2 Primary Relationships

| Relationship | Required | Notes |
| --- | --- | --- |
| `jm1pub_publishingassetid` -> `jm1pub_publishingasset` | Yes | Parent asset |

### 6.3 Recommended Fields

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| `jm1pub_name` | Text | Yes | Marketplace presence label |
| `jm1pub_publishingassetid` | Lookup | Yes | Parent publishing asset |
| `jm1pub_marketplace` | Choice | Yes | Ingram Content / Amazon KDP / ACX / Apple Books / Barnes & Noble / Kobo / Google Play / Other |
| `jm1pub_marketplacestatus` | Choice | No | Live / Pending / Suspended / Not Listed / Unknown / Exception |
| `jm1pub_marketplaceidentifier` | Text | No | Marketplace-specific ID |
| `jm1pub_listingurl` | URL | No | Public listing URL if available |
| `jm1pub_listedprice` | Currency | No | Listed price |
| `jm1pub_currency` | Text/Choice | No | ISO 4217 currency |
| `jm1pub_lastverifiedon` | DateTime | No | Last verification timestamp |
| `jm1pub_evidencesource` | Text/Choice | No | Provider report or manual evidence |
| `jm1pub_exceptionreason` | Multiline Text | No | Exception note |

### 6.4 Alternate Keys

Recommended key:

| Key | Fields |
| --- | --- |
| `AK_jm1pub_assetmarketplace_asset_marketplace_identifier` | `jm1pub_publishingassetid`, `jm1pub_marketplace`, `jm1pub_marketplaceidentifier` |

## 7. Choice Sets

### Publishing Asset Format

- Paperback
- Hardcover
- eBook
- Audiobook
- Large Print
- Workbook
- Other

### Asset Status

- Staged
- In Production
- Live
- Backlist
- Retired
- Exception

### Distribution Status

- Draft
- Active
- Suspended
- Retired
- Unknown

### Metadata Status

- Incomplete
- Complete
- Verified
- Exception

### Marketplace

- Ingram Content
- Amazon KDP
- ACX
- Apple Books
- Barnes & Noble
- Kobo
- Google Play
- Other

### Marketplace Status

- Live
- Pending
- Suspended
- Not Listed
- Unknown
- Exception

### Asset Registry Status

- Not Started
- Staged
- Partially Reconciled
- Reconciled
- Exception

### Asset Health Status

- Healthy
- Needs Review
- Incomplete
- Blocked

## 8. Migration Order

1. Freeze source files with SHA-256 hashes and source paths.
2. Stage the monthly workbook sheets without transforming source values.
3. Stage Bowker prefix CSVs.
4. Stage IS/LSI/CoreSource support files.
5. Create or confirm `jm1pub_title` intellectual-work candidates.
6. Create `jm1pub_publishingasset` candidates from ISBN/format/edition evidence.
7. Link each publishing asset to the correct title.
8. Reconcile ISBNs against Bowker.
9. Reconcile ASIN, ACX, Ingram, LSI, and CoreSource identifiers.
10. Create `jm1pub_assetmarketplace` candidates.
11. Link SharePoint file evidence references.
12. Link `jm1pub_contract` where contract evidence is available.
13. Flag unresolved identity/contract/marketplace exceptions.
14. Calculate first asset health baseline.

## 9. Validation Checklist

- `jm1pub_contract` remains the only agreement / contract basis for this model.
- Contact remains party master.
- `jm1pub_title` remains Intellectual Work.
- `jm1pub_publishingasset` records are child assets of title.
- `jm1pub_assetmarketplace` records are child marketplace presences of asset.
- SharePoint stores production files; Dataverse stores references/metadata only.
- `books.json` is not used as authority.
- No royalties/payments are calculated or executed.
- No files are moved.
- No schema is deployed until separately authorized.

## 10. Open Blockers

| Blocker | Reason |
| --- | --- |
| Existing local OP-000 documents already use IS-008 naming | Jackie may need to decide whether PAM keeps IS-008 as requested or whether the OP-000 schema should be renumbered/archived to avoid two IS-008 meanings. |
| Final Dataverse solution container not selected | Required before build packaging. |
| `jm1pub_title` live field inventory must be read before extensions | Avoid duplicate or conflicting fields. |
| Asset health threshold not approved | Needed before automated health flags become operational. |
| File consolidation approval not granted | Plan stores references only; no SharePoint movement. |
| Royalty-rule migration not authorized | PAM can link future royalty rules but does not create royalty automation. |
