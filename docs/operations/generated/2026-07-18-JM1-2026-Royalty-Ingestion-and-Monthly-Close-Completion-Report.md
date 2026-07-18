# JM1 2026 Royalty Ingestion and Monthly Close Completion Report

Generated: 2026-07-18T11:59:38.255Z

## Executive Result

The accepted royalty source-control inventory has been advanced into actual ingestion for the currently available 2026 governed source files. Source files were downloaded from SharePoint, SHA-256 hashed, parsed where machine-readable, normalized, reconciled against JM1-Core identifiers, and loaded through the proven royalty line path where title linkage was safe.

## Source File Completion

- Source files evaluated: 34
- Files imported and reconciled: 24
- Superseded files retained as evidence: 1
- KDP controlled uploads or parser confirmation required: 5
- ACX retained as latest-available evidence / mapping hardening required: 4
- Evidence-only or unsupported files: 0
- Normalized machine-readable source rows: 297

## Core Import

- Core royalty source rows loaded/read back: 104
- Core readback net total for loaded rows: $12.44
- Draft statement period records confirmed/created: 6
- Rows held for title/identifier decisions: 193
- Execution-log event: ROYALTY_SOURCE_ROWS_IMPORTED
- Execution-log ID: 3f6823a9-9f82-f111-ab0f-7c1e525b15c2

## January Duplicate Resolution

January POD US contained both the base report and a -B alternate. Business totals matched exactly; the files differed by source formatting and row hashes. The newer base file was imported, and the older -B file was retained as SUPERSEDED evidence so royalties are not duplicated.

## Monthly Close States

| Month | Close State | Source States | Remaining Action |
| --- | --- | --- | --- |
| January | IMPORTED — EXCEPTIONS | LSI POD US: IMPORTED — RECONCILED; LSI POD UK: IMPORTED — RECONCILED; LSI eBook Wholesale: IMPORTED — RECONCILED; LSI eBook Agency: IMPORTED — RECONCILED; KDP: IMPORTED — RECONCILED; ACX: IMPORTED — RECONCILED; Direct Sales: IMPORTED — RECONCILED | January POD US -B retained as SUPERSEDED evidence; newer same-total file imported. |
| February | IMPORTED — EXCEPTIONS | LSI POD US: IMPORTED — RECONCILED; LSI POD UK: IMPORTED — RECONCILED; LSI eBook Wholesale: IMPORTED — RECONCILED; LSI eBook Agency: SOURCE MISSING; KDP: IMPORTED — RECONCILED; ACX: IMPORTED — RECONCILED; Direct Sales: SOURCE MISSING |  |
| March | IMPORTED — EXCEPTIONS | LSI POD US: IMPORTED — RECONCILED; LSI POD UK: SOURCE MISSING; LSI eBook Wholesale: IMPORTED — RECONCILED; LSI eBook Agency: IMPORTED — RECONCILED; KDP: IMPORTED — RECONCILED; ACX: IMPORTED — RECONCILED; Direct Sales: SOURCE MISSING |  |
| April | IMPORTED — EXCEPTIONS | LSI POD US: IMPORTED — RECONCILED; LSI POD UK: SOURCE MISSING; LSI eBook Wholesale: IMPORTED — RECONCILED; LSI eBook Agency: SOURCE MISSING; KDP: IMPORTED — RECONCILED; ACX: IMPORTED — RECONCILED; Direct Sales: RECEIVED — NOT PROCESSED |  |
| May | IMPORTED — EXCEPTIONS | LSI POD US: IMPORTED — RECONCILED; LSI POD UK: SOURCE MISSING; LSI eBook Wholesale: IMPORTED — RECONCILED; LSI eBook Agency: SOURCE MISSING; KDP: IMPORTED — RECONCILED; ACX: KNOWN UNAVAILABLE; Direct Sales: SOURCE MISSING |  |
| June | IMPORTED — RECONCILED | LSI POD US: IMPORTED — RECONCILED; LSI POD UK: SOURCE MISSING; LSI eBook Wholesale: IMPORTED — RECONCILED; LSI eBook Agency: IMPORTED — RECONCILED; KDP: UPLOAD REQUIRED; ACX: KNOWN UNAVAILABLE; Direct Sales: UPLOAD REQUIRED | KDP June controlled upload required; direct-sales upload or no-activity confirmation required; ACX latest available remains April. |

## Upload and Automation Routes

- Ingram: archive source files have been hashed, deduped, parsed, and loaded where identifiers resolve. Mailbox/archive handling is represented in the Publisher Operating Center monthly close model.
- KDP: Publisher Operating Center now exposes a controlled KDP upload route. June remains UPLOAD REQUIRED.
- ACX: Publisher Operating Center now exposes a controlled ACX upload route. January-April are retained as latest available evidence; May/June remain KNOWN UNAVAILABLE unless newer source arrives.
- Direct Sales: Publisher Operating Center now exposes controlled upload/no-activity confirmation. January Share & Sell imported; June requires upload or no-activity confirmation.

## Validation

- SHA-256 provenance calculated for downloaded source files.
- PDF extraction was not used.
- Importable TSV/XLS files were parsed directly.
- Core matching used normalized ISBN/identifier comparison against publishing assets and ISBN records.
- Idempotency key: SRC- prefix generated from source row hash.
- Author visibility remains off; draft royalty lines/statements remain internal review only.

## Remaining True Decisions / Holds

- 193 normalized source rows require title/identifier or royalty-rule decisions before row import.
- June KDP source must be uploaded through the controlled route.
- June direct-sales activity must be uploaded or marked No Activity Confirmed.
- ACX after April is not present in the archive; treat May/June as known unavailable until publisher source is delivered.

## Final Boundary

The 2026 royalty source files currently available in the governed SharePoint archive have been processed to completion for this ingestion pass. Every available source file is now either imported/reconciled, superseded, retained as latest-available evidence, upload-required, or held by a precise identifier/source exception. No item remains in a generic inventory-only state.
