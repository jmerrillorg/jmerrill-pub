# JM1 Royalty Operations Wave 1 — Decision Resolution and Statement Readiness Report

Generated: 2026-07-19

## Accepted Baseline

PR #302 is preserved as the deployed royalty source-ingestion baseline.

Accepted production facts retained:

| Measure | Value |
|---|---:|
| Source files evaluated | 34 |
| Files imported/reconciled | 24 |
| Normalized source rows | 297 |
| Core royalty source rows loaded | 104 |
| Held normalized rows | 193 |
| Draft statement period records | 6 |
| January POD US -B | SUPERSEDED |

No accepted rows were reimported. January POD US -B remains superseded.

## Report Timing Rule

Jackie clarified the recurring source-report timing rule:

- automated reports are generated no later than the 10th of the month;
- if no generated report exists before that deadline, no generated report is expected for that month;
- manually created reports may still be created or uploaded at any time.

The Publisher Operating Center read model now applies that distinction. Automated missing sources after the generation deadline no longer remain as vague open waiting items. Manual upload choices remain available where a manual report can still be created, and missing generated reports are not treated as zero activity.

## Decision Queue

The held source-row queue now derives from `2026-07-18-JM1-2026-Royalty-Source-Row-Reconciliation.json`, not from a row-by-row CSV review alone.

| Measure | Value |
|---|---:|
| Held rows grouped | 193 |
| Decision groups created | 180 |
| Affected source net compensation | 1,487.97 |
| Primary decision type | Title Match / Identifier Match |
| High-confidence auto-approvals | 0 |
| Jackie review groups | 180 |

The queue is intentionally conservative: every unresolved row is still held until Jackie approves durable title/identifier mappings or another governed classification.

Each decision card now shows:

- source system;
- source file or source-file count;
- source period;
- account;
- currency;
- ISBN/identifier;
- inferred format;
- unit count;
- source net compensation;
- affected row count;
- matching basis;
- prior matching decision state;
- recommended decision;
- alternatives;
- downstream effect.

## Decisions Processed

No Jackie mapping decisions were applied in this slice.

Rows released today: 0.

Reason: the 193 held rows require publisher approval before durable identifier/title mappings are persisted and before any additional royalty activity is imported.

## Statements

The existing statement period records remain draft/internal. No author visibility was enabled. No statements were emailed, approved, paid, or posted to Business Central.

Wave 1 statement readiness remains dependent on approved mappings:

1. approve or reject grouped identifier/title decisions;
2. reevaluate affected normalized rows;
3. import newly eligible rows through the proven source-row path;
4. refresh statement lines;
5. reconcile statement period totals;
6. mark only fully reconciled statements Ready for Jackie Review.

## Monthly Close

January through June monthly close continues to distinguish imported sources, held rows, parser-ready uploads, manual uploads, superseded sources, and known-unavailable automated reports.

The generated-report timing rule is now exposed in the Publisher Operating Center Monthly Close area.

June remains bounded:

- KDP: manual/finalized report upload remains available where Jackie creates or supplies one;
- ACX: known unavailable after April unless a newer official source is delivered;
- Direct Sales: upload a direct-sales report or confirm no direct-sales activity.

## Publisher Operating Center

Implemented read-model/UI changes:

- accepted production baseline displayed in the royalty panel;
- 193 held rows surfaced as grouped decisions;
- grouped decision count and affected dollars displayed;
- January POD US -B superseded guard displayed;
- report timing policy displayed;
- decision cards expanded with evidence needed for bounded publisher review.

## Validation

Passed:

- `node scripts/royalty_wave1_decision_queue.test.mjs`
- `npm run royalty-import-guard`
- `npm run catalog-source-guard`
- `npm run author-auth-guard`
- `npm run type-check`
- `npm run lint`
- `npm run build`
- `git diff --check`
- changed-file secret scan

Build warnings:

- existing `app/layout.tsx` custom-font warning;
- expected local static-generation Dataverse catalog warnings when production secrets are not present.

## Stop Boundary

This slice does not:

- email royalty statements;
- enable author statement visibility;
- release royalty payments;
- post to Business Central;
- classify unknown rows without evidence;
- create new canonical titles;
- change contractual royalty rates;
- treat missing source files as zero;
- reimport accepted rows.

## Remaining Jackie Actions

1. Review the 180 grouped title/identifier decision cards.
2. Approve durable mappings where evidence is sufficient.
3. Reject, classify, or defer groups that are not JM1 title activity, duplicate activity, or missing evidence.
4. Provide June KDP finalized/manual report if one is created.
5. Upload direct-sales evidence or confirm no direct-sales activity for June.
6. Resolve payment-allocation decisions only after source-row mappings produce statement-ready lines.

## Final Boundary

The governed 2026 royalty sources have already been ingested. Royalty Operations Wave 1 now exposes the remaining held source rows as evidence-based grouped publisher decisions, preserves reusable mapping boundaries, keeps accepted rows idempotent, and prepares the path to reconciled draft statements without exposing statements to authors, issuing payments, or posting financial entries.
