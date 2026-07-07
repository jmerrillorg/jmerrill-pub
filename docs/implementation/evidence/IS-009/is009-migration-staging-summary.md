# IS-009 Migration Staging Summary

**Generated:** 2026-07-07T03:05:25Z
**Source directory:** `/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/Implementation HQ - Documents/General`
**Boundary:** Staging/profile only; no Dataverse import, no file movement, no royalty/payment activity.

## Candidate Counts

| Candidate | Count |
| --- | ---: |
| Title candidates | 162 |
| Publishing asset candidates | 295 |
| Asset marketplace candidates | 537 |
| Assets with ISBN | 293 |
| Assets without ISBN | 2 |
| Marketplace candidates missing identifier | 52 |
| Duplicate ISBNs with conflicting titles | 0 |
| Titles missing author | 26 |

## Source Rule

- Monthly Reporting workbook is the migration blueprint.
- Bowker/Ingram/LSI/CoreSource reports are supporting proof.
- Dataverse is the future system of record after controlled import.
- SharePoint remains the governed file evidence layer.
- `books.json` was not used by this staging engine.

## Outputs

- `data/is009-publishing-asset-staging.json`

## Next Validation

1. Review duplicate/conflicting ISBN exceptions.
2. Review assets without ISBN and marketplace rows without identifiers.
3. Confirm duplicate title/format/edition rules before import.
4. Confirm asset health thresholds before automated health scoring.
