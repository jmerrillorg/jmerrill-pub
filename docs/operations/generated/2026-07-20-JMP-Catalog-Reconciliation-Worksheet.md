# JMP Catalog Reconciliation Worksheet v1.0

Status: Jackie-review worksheet. No Dataverse or commercial SKU migration writes are authorized by this artifact.

## Outputs

- XLSX: `docs/operations/generated/2026-07-20-JMP-Catalog-Reconciliation-Worksheet.xlsx`
- CSV: `docs/operations/generated/2026-07-20-JMP-Catalog-Reconciliation-Worksheet.csv`

## Source Availability

- Parsed: `JMP_Full_Catalog_v2_1.docx`
- Parsed: `JMP_Product_Reference_Guide_v1_1.docx`
- Parsed: `JMP_Package_Edition_Program_Pricing_SKU_Matrix_v1.1.docx`
- Not parsed: `JMP_Products_Services_Catalog_v2.1_CANON-CANDIDATE.docx` (BadZipFile('File is not a zip file'))

## Row Counts

- MIGRATE-AMENDED: 2
- MIGRATE-AS-IS: 93
- PROVISIONAL: 3
- SUPERSEDED: 6

## Required Known Conflict Flags

- `JMP-DES-LARGEPRINT` vs `JMP-EDT-LP-STD`: preflagged.
- `JMP-AUDIO-AI` vs `JMP-AUD-SYNTH-STD`: preflagged.
- `JMP-AUDIO-PRO` vs `JMP-AUD-HUMAN-SV`: preflagged.
- `JMP-MKT-SERIAL` vs `JMP-SER-DIGITAL-06/-12`: preflagged for Jackie ruling.
- `JMP-AUDIO-DIST`: preflagged for double-charge review.

## Boundary

The `jackie_ruling` column is intentionally blank. No SKU migration, reprice, retire, public activation, or Dataverse catalog write should occur from proposed dispositions alone.
