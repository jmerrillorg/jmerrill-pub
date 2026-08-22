# Source Population Summary

Last Verified: 2026-08-22T00:09:38Z

## Source

| Field | Value |
| --- | --- |
| Source file | `3345474237050437112_J_Merrill_Publishing_Vendor_08-21-26-.csv` |
| Source location | Founder-supplied local source; raw CSV not committed |
| Source SHA-256 | `40a34a1ded28e39b1931bf5b5d1795ab7429172f6537a4e612603a0047d079d1` |
| Total Bill.com rows | 186 |
| Exact author suffix | `, Author` |
| Exact author rows | 70 |
| Contains `, Author` rows | 72 |
| Contains-only exclusions | 2 |

## Exclusions

| Vendor Name | Disposition |
| --- | --- |
| Dennis Brown, Author/Editor | EXCLUDED - does not end exactly with `, Author` |
| Alice V. Pryor, Author (deleted) | EXCLUDED - does not end exactly with `, Author` |

## Data Quality Signals

| Signal | Count |
| --- | ---: |
| Missing Primary Email among exact-author rows | 0 |
| Unique Primary Email values among exact-author rows | 69 |
| Duplicate Primary Email groups | 1 |
| Duplicate group evidence | Redacted hash `5531ca699fc86206`, count 2 |

## Sensitive Columns Present

The CSV includes sensitive/vendor-payment columns and must not be committed raw:

- `Tax ID`
- `Account Number`
- `Vendor Bank Country`
- `Vendor Bank Account Status`
- `Payment Network ID`
- `W9 Status`

No Tax IDs, bank-account values, payment-network identifiers, or full source dataset rows are included in this repository evidence package.

