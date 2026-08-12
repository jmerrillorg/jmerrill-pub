# Validation Results

Last Verified: 2026-08-11

## Commands

| Command | Result |
| --- | --- |
| Live Dataverse readback by intake reference | PASS |
| Live Dataverse identity search across both email spellings | PASS |
| Outlook shared mailbox read for internal notification | PASS |
| `node scripts/publishing_intake_orchestration_autostart.test.mjs` | PASS - 10 / 10 |
| `node scripts/publisher_today_read_model.test.mjs` | PASS |
| `npm run type-check` | PASS |

## Side-Effect Check

| Surface | Count |
| --- | ---: |
| Additional intake created by Cody | 0 |
| Additional Contact created by Cody | 0 |
| Additional Lead created by Cody | 0 |
| Additional author acknowledgement sent by Cody | 0 |
| Author Workspace activation | 0 |
| Agreement send | 0 |
| Stripe Connect start | 0 |
| Production progression | 0 |
| Business Central mutation | 0 |
| Website deployment | 0 |
| Iyorwuese duplicate send | 0 |
| PR #431 progression | 0 |

## Current Truth

The event drove the system through the deterministic intake pipeline. The first real human gate is now Jackie review of the Stage 0 diagnostic.
