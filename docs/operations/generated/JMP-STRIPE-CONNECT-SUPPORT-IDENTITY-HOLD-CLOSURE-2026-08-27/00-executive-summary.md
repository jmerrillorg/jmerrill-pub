# Stripe Connect Support / Identity Hold Closure

Last Verified: 2026-08-28T01:12:00Z

Classification: STRIPE_CONNECT_SUPPORT_IDENTITY_CONTROLLED

| Item | State |
| --- | --- |
| Production release | 2ccc1333c63ef01e1d49bbbbf39288a1210022c2 |
| Production health | DEGRADED |
| Degraded dependency | ACS relay host returned HTTP 503 |
| Stripe enrollment dependency | READY |
| Live Stripe readback | PASS |
| Reminder cadence | STRIPE_CONNECT_REMINDER_CADENCE_CONTROLLED |
| Active author relationships evaluated | 56 |
| Setup complete | 4 |
| More information needed | 38 |
| Not started / identity review hold | 14 |
| Active support holds | 2 |
| Corrected Day 0 anchors | 53 |
| Missing Day 0 anchors | 0 |
| Duplicate Day 0 anchors | 0 |
| Old broken anchors active | 0 |
| Day 3 eligible now | 0 |
| Day 7 eligible now | 0 |
| Day 14 eligible now | 0 |
| Generic corrective wave resent | 0 |
| Author support email sent in this pass | 0 |

The current pass did not reopen Stripe Connect architecture. The existing canonical account-link route still reuses the author/payee-scoped Stripe Connect account, blocks activation-code fallback, and does not create duplicate accounts. Focused Connect validation passed.

Derrick Johnson and Mildred Beard are active support cases, not reminder cases. Both require support handling, but the canonical author-facing delivery path is blocked because the ACS relay endpoint returned HTTP 503 during live verification. No support message was sent through a noncanonical workaround.

The prior 15 identity/email hold count reconciles to the current live model as 14 true identity-review holds plus Derrick moved into active support by later mailbox evidence. No ambiguous identity or email row was blindly emailed.
