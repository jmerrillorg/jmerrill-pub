# State Classification

Last Verified: 2026-08-27T01:06:22.788Z

| State | Meaning |
| --- | --- |
| NOT_STARTED | No canonical Connect account is visible for the active author relationship. |
| SETUP_LINK_READY | A canonical account exists and a fresh Stripe Account Link can be issued. |
| SETUP_IN_PROGRESS | Stripe shows current setup requirements and the author has not completed submitted details. |
| MORE_INFORMATION_NEEDED | Stripe needs additional information or has past-due requirements. |
| UNDER_REVIEW | Stripe has submitted information and no current requirements, but payout readiness is not complete. |
| SETUP_COMPLETE | Stripe reports details submitted, payouts enabled, and no current/past-due requirements. |
| IDENTITY_REVIEW | Stripe disabled/pending-review evidence indicates identity/review handling. |
| DUPLICATE_REVIEW | More than one active relationship/account mapping needs human review. |
| EXTERNAL_BLOCK | A structured account id exists but live Stripe readback cannot safely prove the account. |

EMAIL_SENT, link click, Account Link creation, and return-page visit do not equal SETUP_COMPLETE.
