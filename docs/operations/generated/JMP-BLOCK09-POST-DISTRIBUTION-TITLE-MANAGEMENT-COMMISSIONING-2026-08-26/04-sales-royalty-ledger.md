# Sales And Royalty Ledger

Last Verified: 2026-08-26

## Sales Ingestion

Commissioned source report ingestion preserves:

- Distributor / channel
- Reporting period
- Source reference and checksum
- Import batch
- Currency
- Title / edition / format / territory
- Units, returns, adjustments, and governed net source fields
- Immutable source-row lineage

## Data Quality

Duplicate files, missing lineage, unknown title/ISBN, malformed source data, currency mismatch, and suspect reversal conditions fail closed as SALES_DATA_ATTENTION_REQUIRED.

## Royalty Ledger

Supported events:

- ROYALTY_EARNED
- ADJUSTMENT
- REVERSAL
- HOLD
- PAYMENT_ALLOCATION
- CORRECTION
- PRIOR_PERIOD_ADJUSTMENT

Late adjustments append governed events and do not rewrite closed period totals.
