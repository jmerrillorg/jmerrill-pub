# Reminder Eligibility

Last verified: 2026-08-27T10:30:00Z

Rules:

- A scheduled cadence date never sends by itself.
- Current setup state must still require author action.
- Active support holds automation.
- Complete/review/duplicate/external-block states do not receive automated reminders.
- Historical uncertainty allows only the next single governed reminder stage.
- One author can receive at most one reminder per execution cycle.

First real-wave result:

| Field | Count |
| --- | ---: |
| Evaluated | 56 |
| Eligible | 0 |
| Sent | 0 |
| Held support | 1 |
| Not due / not eligible | 55 |
| Complete | 3 |
| Failures | 0 |
| Duplicate sends | 0 |

