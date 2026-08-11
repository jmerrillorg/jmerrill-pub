# Title Truth Reconciliation

Last Verified: 2026-08-11

## Read-Model Correction

The Publisher Operating Center title classification logic was corrected so non-operating records do not appear as active title work by default.

Implemented classifications:

- `active_pipeline`
- `published_catalog`
- `external_hold`
- `archive_historical`
- `reconciliation_required`
- `synthetic_test`
- `certification`
- `manual_recovery`
- `non_title_operational_artifact`

## Operating Center Rules

Synthetic, certification, non-title operational artifacts, and archive-historical rows are excluded from the default Today surface.

Manual recovery and reconciliation-required rows remain visible as explicit operating exceptions rather than being silently treated as backlist.

Backlist/published rows are included only when they have missing ISBN, author-pending, mismatch, or exception evidence.

## Live Inventory Readback

| Measure | Count |
| --- | ---: |
| Titles reviewed | 250 |
| Assets reviewed | 250 |
| Editorial stages reviewed | 28 |
| Production projects reviewed | 1 |
| Operating queue excluded | 30 |
| Duplicate title groups | 54 |

Classification counts:

| Classification | Count |
| --- | ---: |
| certification | 8 |
| synthetic_test | 3 |
| non_title_operational_artifact | 1 |
| active_pipeline | 3 |
| reconciliation_required | 196 |
| manual_recovery | 1 |
| published_catalog | 20 |
| archive_historical | 18 |

## Focus Rows

| Record | Classification |
| --- | --- |
| JM1 Synthetic Intake Final Proof 20260727170349 | synthetic_test |
| JM1 Synthetic Intake Final Proof 20260727172010 | synthetic_test |
| JM1 Synthetic Intake Restored Proof 20260727173332 | synthetic_test |
| JM1 Duplicate Proof 20260727173641 | non_title_operational_artifact |
| The General's Will and Last Testament | manual_recovery |
| The Intentional Leader | active_pipeline |

## Remaining Ambiguity

196 records remain `reconciliation_required` because current Dataverse rows do not contain deterministic active-stage, distribution, publication, archive, or hold evidence. These rows were intentionally preserved as truthful ambiguity/cleanup work. No record was deleted or silently reclassified to backlist.

## Files Modified

- `lib/server/catalog-portfolio.ts`
- `lib/server/publisher-operating-center.ts`
- `scripts/catalog_portfolio_layer.test.mjs`
- `scripts/production_title_contamination_guard.test.mjs`
- `scripts/publisher_today_read_model.test.mjs`
