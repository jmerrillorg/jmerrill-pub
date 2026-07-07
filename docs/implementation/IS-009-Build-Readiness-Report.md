# IS-009 - Build Readiness Report

**Program:** PAM-001 - Publishing Asset Management
**Specification:** `IS-009-Publishing-Asset-Registry-Specification.md`
**Status:** Build readiness complete; Dev schema deployed and validated
**Generated:** 2026-07-06 / 2026-07-07 UTC evidence timestamp
**Boundary:** JM1-Dev schema deployment only; no file movement, no data import, no royalty/payment activity

## Executive Summary

IS-009 build planning is complete and the authorized JM1-Dev build has been deployed.

Completed:

- Source files were frozen with SHA-256 hashes.
- Source-to-target migration mapping was prepared.
- Schema deployment plan was prepared.
- Migration validation checklist was prepared.
- Jackie-only blockers were identified.
- Migration staging engine was built and run.
- Registry health/readiness engine was built and run.

Completed after access repair:

- Live Dataverse metadata inventory was completed with a delegated Azure CLI Dataverse token against JM1-Dev / `org52409ff2.crm.dynamics.com`.
- Proposed IS-009 table conflict check was completed.

Resolved during build:

- `jm1pub_contract` was seeded into JM1-Dev under the canonical logical name.
- `jm1_executionlog` was seeded into JM1-Dev under the canonical logical name.
- `jm1pub_publishingasset` was created in JM1-Dev.
- `jm1pub_assetmarketplace` was created in JM1-Dev.
- Required PAM fields and lookup relationships were created and validated by metadata readback.

Known remaining platform note:

- The client-credential/app-setting Dataverse token path previously failed with `dataverse_token_failed:400`; delegated Azure CLI access was used for readiness/build inventory. Service-principal automation hardening remains a follow-up before unattended production promotion.

Recommendation:

- Treat IS-009 Dev schema build as complete.
- Proceed to migration-engine staging/validation against frozen source files.
- Repair service-principal/client-credential metadata access before relying on unattended automation for future inventory runs.

## 1. Source Freeze Report

Evidence files:

- `docs/implementation/evidence/IS-009/IS-009-Source-Freeze-Report.md`
- `docs/implementation/evidence/IS-009/is009-readiness-evidence.json`

| Source | Size Bytes | SHA-256 | Status |
| --- | ---: | --- | --- |
| `MONTHLY REPORTING 2026(1).xlsx` | 1768009 | `d5524299d871500e9930141e1fd212a0db2c64bcfc859383fe37b2bf836a65e5` | FROZEN |
| `IS report.csv` | 992494 | `580ba5bf238f5a0dc5acde9938be3696ac01c24bec4ece0237f7ed8fe2d4f517` | FROZEN |
| `LSI report.csv` | 26960 | `2d177eb9d0394a7319952f8ca66a798fc3ea1625e8c5c57f46e83fa3e659c4f1` | FROZEN |
| `Total_Asset_Listing_20260706_0831.xlsx` | 34761 | `0d018636bfbd8433203c7384f6b14ffcc84f3fbc77a47ff1b20c3eeeb04c968b` | FROZEN |
| `prefix-9781950719.csv` | 7934 | `eea2df085dd0622b55d4ff73f2ee566b0cb39b1bf73f00fda10e215f848f982b` | FROZEN |
| `prefix-9781954414.csv` | 7735 | `c455a9af99e9b8a6a59c69696b2ec79163654853ff677ecca1c89e191a8c6141` | FROZEN |
| `prefix-9781961475.csv` | 6770 | `7f9ec1515cd942d020eb252edf0139fa617c47902a6cc75ce76d92ba245c8ccf` | FROZEN |
| `prefix-9781969418.csv` | 2127 | `a8427b5e56c5d8edc68beb8d39507f37c227c64eb73c542f9302c014b5347a97` | FROZEN |

Freeze notes:

- Direct byte reads matched filesystem size for all eight files.
- No source files were modified.
- The first shell `shasum` pass produced empty-file hashes for some OneDrive-backed files; the direct read pass corrected that and is the freeze authority for this report.

## 2. Live Dataverse Inventory

Required inventory targets:

- Contact
- `jm1pub_contract`
- `jm1pub_title`
- `jm1_executionlog`
- conflict check for `jm1pub_publishingasset`
- conflict check for `jm1pub_assetmarketplace`

Inventory evidence:

- `docs/implementation/evidence/IS-009/is009-readiness-evidence.json`
- `docs/implementation/IS-009-Dataverse-Live-Inventory-Summary.md`
- `docs/implementation/IS-009-JM1-Dev-Baseline-Remediation-Plan.md`

Current result:

| Item | Result |
| --- | --- |
| Environment | JM1-Dev / `org52409ff2.crm.dynamics.com` |
| Publishing Static Web App Dataverse setting names | Present by name only |
| Diagnostic runner Dataverse setting names | Present by name only |
| Client-credential metadata token acquisition | Failed: `dataverse_token_failed:400` |
| Delegated Azure CLI metadata token acquisition | Succeeded |
| Metadata inventory completed | Yes |
| Secrets exposed | No |
| Dataverse modified | No |

App settings confirmed by name only:

- `DATAVERSE_TENANT_ID`
- `DATAVERSE_CLIENT_ID`
- `DATAVERSE_CLIENT_SECRET`
- `DATAVERSE_RESOURCE_URL`
- `DATAVERSE_WEB_API_BASE_URL`

Inventory summary after authorized build:

| Logical Name | Result | Entity Set | Attributes | Relationships | Keys |
| --- | --- | --- | ---: | ---: | ---: |
| `contact` | Exists | `contacts` | 320 | 20 | 0 |
| `jm1pub_contract` | Exists | `jm1pub_contracts` | 58 | Readback validated | 0 |
| `jm1pub_title` | Exists | `jm1pub_titles` | 38 | Readback validated | 0 |
| `jm1_executionlog` | Exists | `jm1_executionlogs` | 50 | Readback validated | 0 |
| `jm1pub_publishingasset` | Exists | `jm1pub_publishingassets` | 75 | Readback validated | 0 |
| `jm1pub_assetmarketplace` | Exists | `jm1pub_assetmarketplaces` | 50 | Readback validated | 0 |

Nearby table findings:

- `jm1_executionevent` exists.
- `jm1pub_titleownership` exists.
- No `contract` logical-name match was found in JM1-Dev metadata discovery.

## 3. Schema Conflict Check

Conflict check result after authorized build:

| Proposed Artifact | Conflict Question | Status |
| --- | --- | --- |
| `jm1pub_publishingasset` table | Does a table with this logical name already exist? | Created and validated |
| `jm1pub_assetmarketplace` table | Does a table with this logical name already exist? | Created and validated |
| `jm1pub_title.jm1pub_assetregistrystatus` | Does equivalent status field already exist? | Created and validated |
| `jm1pub_title.jm1pub_assetregistrylastverifiedon` | Does equivalent Last Verified field already exist? | Created and validated |
| `jm1pub_title.jm1pub_certifiedimprint` | Does equivalent certified imprint field already exist? | Created and validated |
| `jm1pub_publishingasset` -> `jm1pub_contract` lookup | Can contract lookup be created? | Created and validated |
| Execution logging | Can PAM use `jm1_executionlog`? | `jm1_executionlog` created and validated |

No logical-name conflicts remain in JM1-Dev for the IS-009 schema.

## 3.1 Build Evidence

Build artifacts:

- `scripts/is009_deploy_schema.mjs`
- `docs/implementation/evidence/IS-009/is009-schema-deployment-evidence.json`
- `docs/implementation/evidence/IS-009/is009-readiness-evidence.json`
- `artifacts/is009-baseline/JM1_PAM_BaselinePrerequisites_unmanaged.zip`

Baseline package hash:

- `JM1_PAM_BaselinePrerequisites_unmanaged.zip`
- SHA-256: `1ae8fe8bf8ac30ee7c7fc7d011e8816c8e283fd96d749dc9cde0813c66ea624f`

Important finding:

- The filtered Core solution import failed because it pulled Sales/Opportunity package dependencies plus AI/editorial dependencies.
- To preserve canon without importing those broad packages, JM1-Dev was seeded with same-logical-name baseline components from canon/Core metadata:
  - `jm1pub_contract`
  - `jm1_executionlog`
- This is not a substitution with `jm1_executionevent`; PAM continues to use `jm1_executionlog`.

Readback validation passed for:

- `jm1pub_contract.jm1pub_title`
- `jm1_executionlog.jm1_actiontype`
- `jm1_executionlog.jm1_executionstatus`
- `jm1pub_title.jm1pub_certifiedimprint`
- `jm1pub_title.jm1pub_assetregistrystatus`
- `jm1pub_publishingasset.jm1pub_titleid`
- `jm1pub_publishingasset.jm1pub_contractid`
- `jm1pub_publishingasset.jm1pub_assetformat`
- `jm1pub_assetmarketplace.jm1pub_publishingassetid`
- `jm1pub_assetmarketplace.jm1pub_marketplace`

## 3.2 Migration Engine Evidence

Staging engine:

- Script: `scripts/is009_stage_registry.py`
- Output: `data/is009-publishing-asset-staging.json`
- Summary: `docs/implementation/evidence/IS-009/is009-migration-staging-summary.md`

Staging result:

| Metric | Value |
| --- | ---: |
| Title candidates | 162 |
| Publishing asset candidates | 295 |
| Asset marketplace candidates | 537 |
| Assets with ISBN | 293 |
| Assets without ISBN | 2 |
| Marketplace candidates missing identifier | 52 |
| Duplicate ISBNs with conflicting titles | 0 |
| Titles missing author evidence | 26 |

Health engine:

- Script: `scripts/is009_assess_registry_health.py`
- Output: `data/is009-publishing-asset-health.json`
- Dashboard: `docs/implementation/PAM-001-Enterprise-Asset-Registry-Dashboard.md`

Health result:

| Metric | Value |
| --- | ---: |
| Assets with title link | 100.0% |
| Assets with ISBN | 99.32% |
| Assets with author evidence | 63.39% |
| Assets with format | 100.0% |
| Marketplace rows with identifier | 90.32% |
| Duplicate ISBN conflicts | 0 |

No source data was imported into Dataverse during staging/health assessment.

## 4. Schema Deployment Plan

Target approach:

1. Confirm target environment and solution container.
2. Export pre-build unmanaged solution baseline.
3. SHA-256 the baseline export and store evidence.
4. Complete live metadata inventory.
5. Reconcile proposed IS-009 fields against live inventory.
6. Build in Dev only after Jackie authorizes schema build. Completed.
7. Create or reuse `jm1pub_publishingasset`. Completed.
8. Create or reuse `jm1pub_assetmarketplace`. Completed.
9. Add only missing `jm1pub_title` fields if no equivalent fields exist. Completed.
10. Add relationships. Completed:
    - `jm1pub_publishingasset` -> `jm1pub_title`
    - `jm1pub_publishingasset` -> `jm1pub_contract`
    - `jm1pub_assetmarketplace` -> `jm1pub_publishingasset`
11. Add choice sets. Completed as local choices.
12. Add alternate keys only if live data/null behavior supports them. Deferred until migration duplicate profile is known.
13. Publish customizations. Completed.
14. Validate table readback, field readback, relationship readback, and choice values. Completed.
15. Package deployment evidence. Completed.

Rollback plan:

- Before build, export and hash a baseline solution.
- If Dev build validation fails, remove the unmanaged IS-009 solution components or restore the baseline according to ALM guidance.
- Do not promote to Test or Production until Dev validation passes and Jackie approves.

Security plan:

- Default read/write access should be limited to publishing operations / implementation roles.
- Author Workspace should not expose asset internals unless a future author-facing view is explicitly designed.
- File references may be visible internally, but SharePoint permissions remain the actual file access control.
- No production files should be stored in Dataverse at this stage.

## 5. Source-to-Target Migration Mapping

### 5.1 Workbook / Registry Mapping

| Source | Source Fields | Target |
| --- | --- | --- |
| `MONTHLY REPORTING 2026(1).xlsx` / `ISBN` | ISBN13, Title, Format, Status, ISBN, KINDLE, Published, List Price, Cost, AUTHOR COPY | `jm1pub_title`, `jm1pub_publishingasset` |
| `MONTHLY REPORTING 2026(1).xlsx` / `AUTHOR` | POD, eBook, Amazon, ACX, MasterName | Contact matching and future Author Marketplace Alias staging |
| `MONTHLY REPORTING 2026(1).xlsx` / `POD` | Full ISBN, Title, author, page_count, binding_type, List Price, wholesale discount | `jm1pub_publishingasset`, `jm1pub_assetmarketplace`, future Sales Import Row |
| `MONTHLY REPORTING 2026(1).xlsx` / `LINK` | link_name, isbn, sku, parent_isbn, title, author, quantity_sold | `jm1pub_assetmarketplace`, future Sales Import Row |
| `MONTHLY REPORTING 2026(1).xlsx` / `EBOOK` | product identifiers, sales territory, reporting price/currency, sales rows | `jm1pub_publishingasset`, `jm1pub_assetmarketplace`, future Sales Import Row |
| `MONTHLY REPORTING 2026(1).xlsx` / `AMAZON` | Title, Author, ASIN/ISBN, Marketplace, Units, Payout Plan, List Price | `jm1pub_publishingasset`, `jm1pub_assetmarketplace`, future Sales Import Row |
| `MONTHLY REPORTING 2026(1).xlsx` / `ACX` | Royalty Earner, Product ID, Author, Title, Digital ISBN, units/royalties | `jm1pub_publishingasset`, `jm1pub_assetmarketplace`, future Sales Import Row |
| `MONTHLY REPORTING 2026(1).xlsx` / `Shipping` | Order Qty, Service Level, Extended Amount, Profit, Payment Options | Deferred Shipping / Author Copy Charge |

### 5.2 Supporting Source Mapping

| Source | Target Use |
| --- | --- |
| Bowker prefix CSVs | ISBN assignment proof; validates `jm1pub_publishingasset.jm1pub_isbn13` |
| `IS report.csv` | Ingram/LSI distribution proof for title, ISBN, imprint, and status evidence |
| `LSI report.csv` | Ingram/LSI distribution proof for title, ISBN, imprint, and status evidence |
| `Total_Asset_Listing_20260706_0831.xlsx` | CoreSource / asset-listing proof for publishing assets and distribution identity |
| SharePoint/backlist folders | File evidence references only; no movement during IS-009 readiness |
| `books.json` | Website legacy evidence only; no governing authority |

### 5.3 Target Table Mapping

| Target | Source Priority |
| --- | --- |
| `jm1pub_title` | Existing Dataverse title first; monthly workbook title evidence second; support reports as proof |
| `jm1pub_publishingasset` | Workbook ISBN/format rows first; Bowker/IS/LSI/CoreSource as proof |
| `jm1pub_assetmarketplace` | Provider marketplace reports and identifiers |
| `jm1pub_contract` links | Existing Dataverse contract and contract reconciliation evidence |
| SharePoint references | Existing governed file/folder paths after file evidence inventory |

## 6. Migration Validation Checklist

Pre-build:

- Source files frozen and hashed.
- Dataverse live field inventory complete.
- Table/field conflict check complete.
- Target solution container selected.
- Rollback baseline exported and hashed.

Post-schema build:

- `jm1pub_publishingasset` exists.
- `jm1pub_assetmarketplace` exists.
- Relationships resolve.
- Choice values match IS-009.
- Alternate keys or duplicate rules are present only if approved.
- SharePoint file reference fields are URL/text metadata, not Dataverse file storage.
- `jm1pub_contract` remains the agreement basis.
- `jm1pub_title` remains Intellectual Work.
- OP-000 IS-008 artifacts remain untouched.

Pre-import:

- Workbook rows staged without transformation.
- Row counts match source profile.
- ISBN normalization rules tested.
- Title/format duplicate rules tested.
- Marketplace identifier matching tested.
- `books.json` excluded as authority.

Post-import:

- Asset count reconciles against workbook ISBN rows and staged exceptions.
- Marketplace presence count reconciles against provider reports.
- ISBNs validate against Bowker where available.
- Contract links are only created where evidence exists.
- File references point to SharePoint evidence and do not move files.
- Exceptions are captured for missing format, missing title, conflicting title/ISBN, and missing marketplace identifiers.

## 7. Remaining Jackie-Only Blockers / Decisions

| Blocker | Required Decision |
| --- | --- |
| Client-credential metadata access still failing | Repair the service principal/app setting values before unattended automation/promotion. Delegated Azure CLI access completed readiness/build inventory but is not an automation credential. |
| Asset health threshold | Approve score threshold and weighting before health automation. |
| Title/format duplicate rules | Decide how to handle similar editions, revised editions, and title variants. |
| Contract evidence ambiguity | Decide how strict evidence must be before linking a contract to title/assets. |
| File movement | Not part of readiness; requires later approval. |
| Royalty migration | Not part of readiness; requires later approval. |

## 8. Readiness Recommendation

IS-009 Dev schema build is operationally ready for migration-engine staging.

Recommended next step:

1. Build migration staging/validation scripts from the frozen workbook, Bowker, Ingram/LSI, and asset listing sources.
2. Produce staged source profiles without importing production data.
3. Validate title/ISBN/format/marketplace matching rules.
4. Use staged exceptions to finalize duplicate/health thresholds before any broad data import.
