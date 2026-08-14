# 17 - Operating Center Truth

Last verified: 2026-08-14T01:41:41.767Z

Required default behavior:

- Real titles only by default.
- Test, certification, synthetic, and duplicate records isolated behind an explicit debug/test toggle.
- One title equals one editorial card.
- Cards show stage, artifact, waiting owner, blocker, next action, automation status, and whether Jackie genuinely needs to act.
- UI must request governed actions from canonical services; no drag/drop or direct status mutation may bypass gate validation.

Current evidence:

| Metric | Count |
| --- | --- |
| Active real title rows in recovery state table | 15 |
| Test/certification/synthetic rows isolated | 52 |
| Current Jackie rows from dry-run ledger | 1 |
| Current author rows from dry-run ledger | 4 |
| Current system rows from dry-run ledger | 2 |