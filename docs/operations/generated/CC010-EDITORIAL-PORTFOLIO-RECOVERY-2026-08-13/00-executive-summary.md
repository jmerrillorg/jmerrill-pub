# CC-010 Editorial Portfolio Recovery Evidence Package

Last verified: 2026-08-14T01:41:41.767Z

## Classification

DRY-RUN COMPLETE - CC-010 EDITORIAL PORTFOLIO RECOVERY EVIDENCE GENERATED

This package is the required evidence-first pass before broad mutation. It discovers title records from Dataverse and governed Publishing SharePoint sync, classifies real/test/certification/noise, computes proposed CC-010 re-entry states, and records mutation intent. No Dataverse mutation is performed by this generator.

| Metric | Count |
| --- | --- |
| Total discovered records | 593 |
| Real unique active title groups | 15 |
| Active editorial title state rows | 15 |
| Published/backlist groups | 173 |
| Test/certification/synthetic/duplicate rows isolated | 52 |
| Reconciliation-required groups | 8 |
| Stranded assets | 0 |
| Jackie actions | 1 |
| Author actions | 4 |
| System-owned queue | 2 |
| External dependency queue | 1 |
| Prior five recovered | 5 |

## Boundary

- No title is reset to Stage 0 merely for CC-010 uniformity.
- No author communication is sent.
- No Jackie notification is sent.
- No Dataverse record is patched by this generator.
- Reconciliation remains evidence-first; ambiguous title groups are marked `RECONCILIATION_REQUIRED`.

## Runtime Drift

Function App runtime last verified: Node|22

Node 24 drift classification: HOST_ROLLBACK_EXCEPTION_RECORDED. The current production host remains Node 22 because the prior Node 24 host failed during commissioning; this pass records the drift and does not assume Node 22 is the desired end state.