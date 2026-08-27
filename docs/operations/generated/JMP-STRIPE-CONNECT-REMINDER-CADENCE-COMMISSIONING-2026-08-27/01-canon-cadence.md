# Canon Cadence

Last verified: 2026-08-27T10:30:00Z

Canon source:

`docs/governance/publishing/JMP-STRIPE-CONNECT-REMINDER-CADENCE-v1.md`

| Cadence point | Event | Rule |
| --- | --- | --- |
| Day 0 | `INITIAL_INVITATION` | Initial valid delivered setup invitation. |
| Day 3 | `REMINDER_1` | First automated reminder if current Stripe state still requires author action. |
| Day 7 | `REMINDER_2` | Second automated reminder if current Stripe state still requires author action. |
| Day 14 | `FINAL_REMINDER` | Final automated reminder if current Stripe state still requires author action. |
| After Day 14 | `AUTOMATED_REMINDERS_STOP` | No further automated reminders; status remains visible for support/operator follow-up. |

Clock authority:

`CONNECT_INITIAL_INVITATION_VALID_DELIVERY_AT = DAY_0`

Do not calculate from account creation, Dataverse row creation, link generation, failed email attempt, or operator memory.

