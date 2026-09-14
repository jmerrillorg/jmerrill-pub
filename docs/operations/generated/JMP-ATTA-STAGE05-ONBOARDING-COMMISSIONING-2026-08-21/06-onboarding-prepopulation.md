# Onboarding Prepopulation

Last verified: 2026-08-22T00:32:44Z

Known data that must not be requested again as if unknown:

| Data | Source |
| --- | --- |
| Author legal/name record | Contact + executed agreement |
| Project title | Opportunity + Title record, currently Untitled |
| Package | Executed package addendum + Opportunity |
| Payment plan | Opportunity + Stripe reconciliation evidence |
| Payment policy | Structured contract + PR #553 evidence |
| First payment state | Dataverse first-payment fields + execution log |
| Manuscript received | Publishing intake `JMP-INT-202607-422JSZ` |

Remaining author-facing collection must be limited to missing confirmations or preferences. Atta must not be sent back to `/join` and must not be asked to repeat known commercial or identity facts.
