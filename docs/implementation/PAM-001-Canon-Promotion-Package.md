# PAM-001 - Canon Promotion Package

**Program:** PAM-001 - Publishing Asset Management  
**Status:** Canon promotion package prepared; schema not deployed  
**Authority:** Jackie approval of corrected PAM-001 / IS-009 structure, 2026-07-06  
**Primary References:** `PAM-001-Publishing-Asset-Management.md`, `IS-009-Publishing-Asset-Registry-Specification.md`, `Publishing-Asset-Registry-Migration-Plan.md`  

## 1. PAM-001 Canon Promotion Summary

PAM-001 is ready for canon promotion as the enterprise Publishing Asset Management doctrine and planning baseline.

Confirmed canon points:

| Canon Point | Confirmation |
| --- | --- |
| `jm1pub_title` | Remains the Intellectual Work. It represents the book as a concept, not each format. |
| `jm1pub_publishingasset` | New format / edition / ISBN asset layer beneath `jm1pub_title`. |
| `jm1pub_assetmarketplace` | Marketplace/distribution presence layer beneath `jm1pub_publishingasset`. |
| `jm1pub_contract` | Remains the agreement / contract basis. |
| SharePoint | Governed file evidence layer for production files and historical file evidence. |
| Dataverse | Stores operational records, references, URLs, metadata, verification state, and evidence links only. |
| PAM schema authority | Governed by `IS-009-Publishing-Asset-Registry-Specification.md`. |
| OP-000 IS-008 | Remains untouched and continues to govern pipeline adoption/certification schema. |
| `books.json` | Website legacy evidence only; not a governing source. |

Promotion effect:

- PAM-001 becomes canon for publishing asset identity.
- IS-009 becomes the build specification candidate for the registry schema.
- The monthly reporting workbook and supporting reports become migration planning sources, not live Dataverse data until a later build/import authorization.

## 2. IS-009 Build Readiness Checklist

IS-009 is build-ready only after every item below is complete.

| Check | Required Evidence | Status |
| --- | --- | --- |
| PAM-001 promoted to canon | Jackie approval / canon marker | Pending |
| Final Dataverse solution container selected | Solution name, publisher, target environment | Pending |
| Target environment selected | Dev/Test/Production boundary documented | Pending |
| Live `jm1pub_title` field inventory completed | Export/readback of existing fields and relationships | Pending |
| Live `jm1pub_contract` relationship inventory completed | Confirm lookup strategy before adding asset references | Pending |
| Existing choice sets reviewed | Confirm no duplicate or conflicting choices | Pending |
| Security role impact reviewed | Roles that can read/write asset and marketplace records | Pending |
| Field-level security reviewed | Confirm whether any marketplace/contract/file reference fields need protection | Pending |
| Alternate-key strategy approved | ISBN and marketplace key behavior reviewed for null/duplicate edge cases | Pending |
| Duplicate detection strategy approved | Rules for title/format/edition/identifier conflicts | Pending |
| Execution log event behavior confirmed | `jm1_executionlog` event-type format verified | Pending |
| Rollback plan written | Managed/unmanaged solution rollback path | Pending |
| Validation plan written | Post-build table/field/relationship/readback checklist | Pending |

Build fence:

- Do not deploy IS-009 until Jackie separately authorizes schema build.
- Do not create substitute tables.
- Reuse existing equivalent fields if present.
- Stop if the live field inventory contradicts the proposed schema.

## 3. Source File Freeze / Hash Checklist

The migration source files must be frozen before any import/staging build.

Primary source:

| Source | Required Freeze Evidence | Status |
| --- | --- | --- |
| `MONTHLY REPORTING 2026(1).xlsx` | Full path, modified timestamp, SHA-256 hash, sheet list, row counts | Pending build freeze |

Supporting sources:

| Source | Required Freeze Evidence | Status |
| --- | --- | --- |
| `IS report.csv` | Full path, modified timestamp, SHA-256 hash, encoding, row count | Pending build freeze |
| `LSI report.csv` | Full path, modified timestamp, SHA-256 hash, encoding, row count | Pending build freeze |
| `Total_Asset_Listing_20260706_0831.xlsx` | Full path, modified timestamp, SHA-256 hash, row count | Pending build freeze |
| Bowker prefix CSVs | Full path, modified timestamp, SHA-256 hash, assigned/available ISBN counts | Pending build freeze |

Freeze rules:

- Freeze source files before staging or import.
- Do not edit source files in place.
- Store source hashes with the migration run evidence.
- If a source file changes after freeze, create a new freeze record rather than overwriting evidence.
- Treat workbook intelligence as migration blueprint, not permanent system of record after Dataverse migration.

## 4. Dataverse Live Field Inventory Checklist

Before IS-009 build, read live Dataverse metadata for each table below.

| Table | Inventory Required |
| --- | --- |
| Contact | Existing author/contact identity fields, author status fields, workspace status fields |
| `jm1pub_title` | Existing title, imprint, ISBN, author lookup, contract lookup, status, publication date, and asset-related fields |
| `jm1pub_contract` | Existing title/contact/opportunity links, agreement status, contract evidence fields |
| `jm1_executionlog` | Event type field, payload/summary fields, reference fields, correlation/idempotency support |
| Existing royalty tables, if present | Relationship names only; do not modify |

Inventory output must include:

- Logical table names
- Display names
- Existing columns
- Existing lookups/relationships
- Existing choice columns and values
- Existing alternate keys
- Existing security/field security notes if available
- Conflicts with proposed IS-009 fields
- Reuse recommendations for equivalent fields

Inventory fence:

- Read metadata only.
- Do not create fields during inventory.
- Do not create tables during inventory.
- Do not rename existing columns.
- Do not reinterpret the PAM model if field names differ; map or escalate.

## 5. Build Blockers Requiring Jackie Only

| Blocker | Why Jackie Is Required |
| --- | --- |
| Final PAM solution container selection | Determines ALM packaging and ownership. |
| Asset health threshold and weighting | Business priority decision, not technical inference. |
| Title/format duplicate resolution rules | Determines whether similar editions are merged, split, or reviewed. |
| Author identity matching ambiguity | Affects Contact party master integrity. |
| Contract evidence ambiguity | Determines whether a title/asset can be treated as contract-linked. |
| File movement or backlist consolidation | SharePoint movement is out of scope for schema readiness. |
| Royalty-rule migration | Money-adjacent logic requires separate authorization. |
| Any conflict between live Dataverse schema and PAM canon | Potential architecture/build decision. |

## 6. Boundaries Preserved

This promotion package did not:

- Deploy schema
- Modify Dataverse
- Move SharePoint or backlist files
- Touch royalties or payments
- Update `books.json`
- Change OP-000 IS-008 documents
- Start migration import

