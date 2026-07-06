# PAM-001 - Publishing Asset Management

**Classification:** Enterprise Foundation Program  
**Status:** CANON-CANDIDATE - Jackie-approved direction, pending final canon promotion  
**Primary Home:** Implementation HQ / JM1 Publishing / PAM  
**Authority:** CANON-CANDIDATE v1.2; Architecture Packet LOCKED 2026-06-27; DO-001 CANON; Jackie correction 2026-07-06  
**Approval Authority:** Jackie Smith Jr.  
**Doctrine:** Model output is recommendation. Jackie approval creates canon. Logged execution creates operational truth.

## Mission

Create and maintain the canonical system of record for every publishing asset owned or managed by J Merrill Publishing, Inc. PAM is the enterprise foundation layer beneath publishing operations, distribution, royalty readiness, catalog health, and executive reporting.

PAM answers:

- What do we own or manage?
- Which intellectual work does each asset belong to?
- Which ISBN belongs to which format or edition?
- Which marketplace identifiers belong to each asset?
- Where are the governed files?
- Which contract governs the work?
- Which royalty rule applies?
- Which assets are healthy, incomplete, retired, or needing review?

## Why PAM Exists

| Program | Primary Question | Domain |
| --- | --- | --- |
| PAM | What do we own, and in what form? | Asset registry and identity |
| PROGRAM-002 | Where is this author in the publishing journey? | Relationship and operations |
| OP-000 | How do existing authors/titles enter PROGRAM-002? | Adoption and certification |
| Royalty Automation | What does this author earn this cycle? | Financial obligation |
| Distribution | Where is this asset available? | Marketplace presence |
| Marketing | How is this asset reaching readers? | Audience development |

PROGRAM-002 manages the publishing relationship. PAM manages the publishing assets. Downstream systems should read from PAM for asset identity, formats, identifiers, marketplace presence, file references, and asset health.

## Canonical Model

```
Contact
(Person / party master)
        |
        v
jm1pub_contract
(Merged publishing agreement / contract basis)
        |
        v
jm1pub_title
(Intellectual Work - the book as a concept)
        |
        +-- jm1pub_publishingasset
        |   (Format / edition / ISBN asset)
        |
        +-- jm1pub_publishingasset
        |   (Additional format / edition)
        |
        v
jm1pub_assetmarketplace
(Marketplace / distribution presence per asset)
```

Canonical decisions:

- Contact remains the party master.
- `jm1pub_contract` is the merged publishing agreement / contract basis.
- `jm1pub_title` is the Intellectual Work.
- `jm1pub_publishingasset` is the format, edition, or ISBN-bearing asset.
- `jm1pub_assetmarketplace` is the marketplace/distribution presence for a specific asset.
- PAM uses `jm1pub_contract` as the only agreement / contract basis for this model.
- PAM does not replace `jm1pub_title`; it extends the model below it.
- PAM schema belongs in `IS-009-Publishing-Asset-Registry-Specification.md`, not as an IS-001 amendment.

## File Storage Doctrine

SharePoint is the governed file evidence layer for publishing assets.

Dataverse stores:

- File references
- URLs
- folder IDs
- metadata
- evidence source
- verification status
- last verified date

Dataverse does not store production files directly at this stage.

This preserves SharePoint as the document/file layer and Dataverse as the operational record layer.

## Data Model

### Existing: Contact

Canonical person / party master.

PAM uses Contact for author identity and does not create a replacement identity model.

### Existing: `jm1pub_contract`

Canonical merged agreement / contract basis.

PAM links title and asset records to the governing contract where known. Historical agreements remain reconciliation evidence until linked.

### Existing: `jm1pub_title`

Canonical intellectual work.

One row should represent the book as a concept, regardless of how many ISBNs, formats, marketplaces, editions, or production files exist.

### New: `jm1pub_publishingasset`

One row per format / edition / ISBN-bearing asset.

Examples:

- Paperback first edition
- Hardcover first edition
- eBook
- Audiobook
- Large print
- Workbook
- Revised edition

Core fields are specified in IS-009.

### New: `jm1pub_assetmarketplace`

One row per marketplace/distribution presence for a publishing asset.

Examples:

- Ingram Content paperback listing
- Amazon KDP eBook listing
- ACX audiobook listing
- Apple Books eBook listing

Core fields are specified in IS-009.

## Asset Health Model

Every publishing asset should receive a health assessment across these dimensions:

| Dimension | Checks |
| --- | --- |
| Metadata | Title, subtitle, author, description, BISAC/categories, keywords, imprint, format, price |
| Files | Governed SharePoint references for cover, interior, eBook, audio, source package, or other production files |
| Contract | `jm1pub_contract` linked or historical contract reconciliation status recorded |
| Distribution | Marketplace presence exists and status is known |
| Royalties | Royalty rule can be resolved or is flagged for reconciliation |

Asset Health Score should be calculated after the registry is populated. A missing dimension should flag the asset for review rather than block the registry from capturing known evidence.

## PAM Workstreams

### PAM-001 - Publishing Asset Registry

Create the canonical asset registry model and populate staged registry records from governed migration sources.

### PAM-002 - Backlist Consolidation

Inventory and reconcile legacy backlist, active-project, and pre-pipeline folders into the asset registry without moving files until separately approved.

### PAM-003 - Asset Reconciliation

Use the monthly reporting workbook, Bowker, Ingram, LSI/CoreSource, and marketplace exports to resolve ISBNs and identifiers.

### PAM-004 - Marketplace Identity

Normalize marketplace/distribution presence through `jm1pub_assetmarketplace`.

### PAM-005 - Asset Health

Run the first enterprise asset health baseline and create remediation queues for incomplete or inconsistent records.

## Relationship to Existing Canon

| System / Program | PAM Relationship |
| --- | --- |
| Contact | PAM reuses Contact as the party master. |
| `jm1pub_contract` | PAM reads and links the contract basis. It does not create a parallel agreement entity. |
| `jm1pub_title` | PAM extends it with child asset records. |
| `jm1pub_publishingasset` | New PAM child table for asset-level identity. |
| `jm1pub_assetmarketplace` | New PAM child table for marketplace/distribution presence. |
| `jm1pub_royaltyrule` | PAM links assets to royalty rules when royalty migration is authorized. |
| PROGRAM-002 | PROGRAM-002 can read PAM for formats, files, distribution status, and asset readiness. |
| OP-000 | OP-000 adopts relationships and history; PAM certifies asset identity and completeness. |
| SharePoint | Governed file evidence layer. |
| `jm1_executionlog` | PAM events should be logged where practical. |

## Migration Roadmap

### Phase 1 - Source Staging

Stage `MONTHLY REPORTING 2026(1).xlsx`, supporting reports, and Bowker prefix files with source hashes and row counts.

### Phase 2 - Registry Seed

Seed `jm1pub_title` and `jm1pub_publishingasset` candidates from the monthly reporting workbook and distribution proof.

### Phase 3 - Identifier Reconciliation

Confirm ISBN, ASIN, ACX, Ingram, LSI, and CoreSource identifiers. Flag conflicts; do not silently choose a winner.

### Phase 4 - Marketplace Presence

Create `jm1pub_assetmarketplace` candidates for each marketplace/distribution presence.

### Phase 5 - File Evidence Linking

Link SharePoint evidence locations to assets. Do not move files until the consolidation plan is separately approved.

### Phase 6 - Contract/Royalty Linkage

Link assets to `jm1pub_contract` and royalty-rule records after reconciliation is authorized.

### Phase 7 - Health Baseline

Calculate asset health and produce the first enterprise asset health dashboard.

## Execution Log Events

| Event | Trigger |
| --- | --- |
| `PAM_ASSET_CREATED` | New publishing asset created |
| `PAM_ASSET_LINKED_TO_TITLE` | Asset linked to intellectual work |
| `PAM_CONTRACT_LINKED` | Asset/title linked to `jm1pub_contract` |
| `PAM_ISBN_VERIFIED` | ISBN confirmed against Bowker or publisher proof |
| `PAM_IDENTIFIER_RECONCILED` | Marketplace/distribution identifier confirmed |
| `PAM_MARKETPLACE_CONFIRMED` | Marketplace status verified |
| `PAM_FILE_REFERENCE_LINKED` | SharePoint file evidence reference linked |
| `PAM_HEALTH_ASSESSED` | Asset health score calculated |
| `PAM_HEALTH_FLAGGED` | Asset health issue detected |
| `PAM_EDITION_SUPERSEDED` | Prior edition marked non-current |
| `PAM_ASSET_RETIRED` | Asset marked retired |

## Open Decisions Before Build

| Decision | Owner | Status |
| --- | --- | --- |
| Confirm final Dataverse publisher prefix and solution container for PAM tables | Jackie + Cody | Pending |
| Approve asset health score threshold and dashboard weighting | Jackie | Pending |
| Approve file movement/consolidation after registry references are staged | Jackie | Pending |
| Approve royalty-rule migration and live royalty automation separately | Jackie | Pending |

## Current Boundaries

This canon candidate does not:

- Deploy schema
- Modify Dataverse
- Move SharePoint/backlist files
- Update `books.json`
- Run OP-000 adoption
- Touch royalties or payments
