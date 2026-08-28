# Day 0 / Reminder State

Last Verified: 2026-08-28T11:03:52.486Z

| Field | Value |
| --- | --- |
| Reminder classification | STRIPE_CONNECT_REMINDER_CADENCE_CONTROLLED |
| Production release | 9ee247d56094926678a9129bd36959e5fedca128 |
| Production health | ready |
| Stripe readback | PASS |
| ACS | ready |

## Day 0

| Metric | Count |
| --- | --- |
| correctedAnchors | 53 |
| missing | 0 |
| duplicate | 0 |
| oldAnchorsActive | 0 |

## First Wave Dry Run

| Metric | Count |
| --- | --- |
| evaluated | 56 |
| day3Eligible | 0 |
| day7Eligible | 0 |
| day14Eligible | 0 |
| completeStop | 4 |
| underReviewHold | 0 |
| supportHold | 2 |
| identityHold | 14 |
| duplicateHold | 0 |
| notDue | 36 |
| sent | 0 |
| failed | 0 |
| duplicateSends | 0 |

Reminder cadence remains controlled: this closure ran the evaluator in dry-run/no-write mode. It did not send reminders or mutate author timestamps.

The reminder runtime console field named identityHold is reminder-gate shorthand for accounts that are not reminder-sendable because the current setup path is not ready for a fresh reminder. It is not the founder identity-review debt metric; founder identity review remains 0 in the post-merge estate.
