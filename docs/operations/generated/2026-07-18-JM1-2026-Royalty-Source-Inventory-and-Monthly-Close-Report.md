# JM1 2026 Royalty Source Inventory and Monthly Close Automation Report

Generated: 2026-07-18

## 2026 Inventory

Source root inspected: `04_Financials/2026` on the Publishing Team SharePoint site.

The archive contains month folders `01` through `12`. January through June contain source files. July through December currently contain no files, which is expected for future or not-yet-closed periods as of 2026-07-18.

Root-level files:

| File | Classification |
| --- | --- |
| `JM_Publishing_Royalty_Reports_April_May_2026.xlsx` | Already used as April/May statement evidence |
| `MONTHLY REPORTING 2026(1).xlsx` | Historical spreadsheet; retired reference only |

Detailed machine-readable inventory:

- `docs/operations/generated/2026-07-18-JM1-2026-Royalty-Source-Inventory.json`
- `docs/operations/generated/2026-07-18-JM1-2026-Royalty-Monthly-Close.json`

## Monthly Close Status

| Month | LSI / Ingram | KDP | ACX | Direct / Other | Close Status |
| --- | --- | --- | --- | --- | --- |
| January | Present: POD US, POD UK, eBook Wholesale, eBook Agency, Global Connect | Present | Present | Share & Sell present | Source Present - Awaiting File-Level Import |
| February | Present: POD US, POD UK, eBook Wholesale | Present | Present | Direct not found | Source Present - Awaiting File-Level Import |
| March | Present: POD US, eBook Wholesale, eBook Agency | Present | Present | Direct not found | Source Present - Awaiting File-Level Import |
| April | Present: POD US, eBook Wholesale, AR invoice evidence | Present | Present | Invoice evidence present | Draft Statements Exist - Source Provenance Pending |
| May | Present: POD US for 6116305/9118734, eBook Wholesale, Global Connect | Present | Not found; latest archived ACX month is April | Direct not found | Draft Statements Exist - Waiting on ACX/Source Provenance |
| June | Present: POD US for 6116305/9118734, eBook Wholesale, eBook Agency, Global Connect | Missing | Not found; latest archived ACX month is April | Direct pending | Waiting on Sources |

## Missing Sources

Items still needed or requiring publisher confirmation:

- January: resolve the two `LSI POD Wholesale Comp Report for 9118734 (US-USD)` variants; one appears to be an updated or alternate source.
- February: confirm whether eBook Agency and Direct Sales reports were not issued or are missing.
- March: confirm whether UK POD and Direct Sales reports were not issued or are missing.
- April: backfill source-file provenance into the already-created April draft statements.
- May: obtain ACX May if published; backfill source-file provenance into the already-created May draft statements.
- June: controlled KDP upload, Direct Sales evidence, and ACX latest-available refresh when published.

## Duplicate Detection

Current classifications:

- Already used as statement evidence: `JM_Publishing_Royalty_Reports_April_May_2026.xlsx`.
- Ready to import: all monthly source files except evidence-only items and the January alternate POD file.
- Duplicate or alternate version: `04_Financials/2026/01/LSI POD Wholesale Comp Report for 9118734 (US-USD)-B.xls`.
- Evidence only: `04_Financials/2026/04/Lightning Source AR Invoice for (6116305) - (J Merrill Publishing, Inc.)`.
- Retired reference: `MONTHLY REPORTING 2026(1).xlsx`.

The SharePoint connector exposed `quickXorHash`, file size, item ID, filename, folder, and modified date. SHA-256 must be calculated when each raw source file is downloaded/imported into the royalty ingestion path. No source file should be loaded into royalty calculations until its SHA-256, report period, source account, and source totals are recorded.

## Automation Status

| Source | Status |
| --- | --- |
| Ingram / Lightning Source | Source archive is established and monthly files are recognizable. Production mailbox automation remains implementation-pending: recognize sender/report type, archive attachment, hash, parse XLS/XML, normalize, import, and route exceptions. |
| KDP | Controlled monthly upload remains required. Publisher Today now has the data model to show upload-required months. |
| ACX | Controlled latest-available upload remains required. Current archive proves ACX through April 2026. May/June should not be treated as missing if ACX has not published them yet. |
| Direct Sales | January Share & Sell evidence exists; later months need controlled upload or explicit unavailable/deferred status. |

## Source Provenance Requirement

Every imported royalty row must carry:

- source system;
- source file;
- SHA-256 hash;
- SharePoint item reference;
- import date;
- reporting month;
- account;
- currency;
- importer;
- execution log;
- linked draft statement.

## Recommendation

The existing contents of `04_Financials/2026` are sufficient to establish the governed 2026 source inventory and begin file-level ingestion without requesting broad manual re-downloads.

They are not yet sufficient to fully populate the 2026 royalty system from source-file provenance because:

- June KDP is not present.
- May/June ACX are not present; latest archived ACX month is April.
- Direct Sales evidence is present only for January.
- April/May draft statements exist, but their rows were created from statement evidence rather than each archived monthly source file's SHA-256 provenance.
- Ingram mailbox automation is not yet deployed.

## Boundary Statement

The JM1 royalty system is now positioned to operate from governed source files rather than manual spreadsheets. Every available 2026 SharePoint royalty source is inventoried, classified, and surfaced for monthly close tracking. The Publisher Operating Center can display the operational checklist for monthly royalty close. The remaining work is file-level ingestion/provenance implementation and missing-source collection for the specific gaps listed above.
