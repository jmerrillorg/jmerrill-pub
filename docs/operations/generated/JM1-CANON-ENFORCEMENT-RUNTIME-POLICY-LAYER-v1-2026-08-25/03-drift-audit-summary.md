# Drift Audit Summary

Last verified: 2026-08-25

Evidence source:

- `02-drift-audit.json`

## Static Repository Screen

| Drift family | Matches | Classification summary |
| --- | ---: | --- |
| `NEW_NON_STRIPE_PAYMENTS` | 13 | `HISTORICAL_EVIDENCE_ONLY: 13` |
| `WRONG_PUBLISHING_EMAILS` | 94 | `DETERMINISTIC_REPAIR: 7`, `HISTORICAL_EVIDENCE_ONLY: 87` |
| `IDENTITY_MISMATCHES` | 5 | `HISTORICAL_EVIDENCE_ONLY: 5` |
| `UNSAFE_AUTHOR_ARTIFACTS` | 1068 | `DETERMINISTIC_REPAIR: 615`, `TRUE_HUMAN_REVIEW: 6`, `HISTORICAL_EVIDENCE_ONLY: 447` |
| `SUPERSEDED_CURRENT_ARTIFACTS` | 18 | `DETERMINISTIC_REPAIR: 5`, `HISTORICAL_EVIDENCE_ONLY: 13` |
| `PUBLICATION_INTENT_VIOLATIONS` | 1 | `HISTORICAL_EVIDENCE_ONLY: 1` |
| `EDITORIAL_GATE_VIOLATIONS` | 1 | `HISTORICAL_EVIDENCE_ONLY: 1` |
| `CADENCE_VIOLATIONS` | 7 | `HISTORICAL_EVIDENCE_ONLY: 7` |
| `WAITING_ON_MISCLASSIFICATIONS` | 3 | `HISTORICAL_EVIDENCE_ONLY: 3` |
| `LEGACY_NEW_WORK_REFERENCES` | 7 | `HISTORICAL_EVIDENCE_ONLY: 7` |

## Interpretation Boundary

This audit is a static repository drift screen, not a live Dataverse, Stripe, Business Central, Outlook, or SharePoint mutation audit.

The `DETERMINISTIC_REPAIR` rows are source-level candidates for future burn-down review. Many are expected to include validator code, blocked-word guards, API field names, or internal diagnostic surfaces and should not be treated as author-facing artifact leakage without route-level context.

The runtime implementation in this PR blocks the active high-risk paths that motivated the policy layer:

- new non-Stripe payment routing;
- noncanonical Publishing sender/reply/CC/HTML;
- Indomitable/Atta identity fallback;
- superseded editorial source authority;
- editorial gate/cadence bypass;
- incomplete Full Wrap production authority;
- false Waiting-On state.

