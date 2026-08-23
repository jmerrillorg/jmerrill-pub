# Policy Version

- Prior version: JMP_FINANCING_EARLY_PAYOFF_v1.0
- New version: JMP_FINANCING_EARLY_PAYOFF_v1.1
- Effective: upon merge/deploy of this change
- Reason for version bump: plan availability changed (12/18/24 added, 16-month standard availability retired — it was never actually implemented). Economics unchanged: 6% annual simple plan charge, financedMonths = installmentCount - 1, no early-payoff penalty, unearned future charge waived, tax external.
- Backward compatibility: any record/snapshot still labeled v1.0 continues to resolve to the new-financing math family (identical economics for the plans it already offered: FULL/2/4/8) rather than downgrading to legacy 4% math.
