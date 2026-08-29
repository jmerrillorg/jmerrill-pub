# Intent and Authority Policy

Last Verified: 2026-08-29T07:12:31Z

## Intent Vocabulary

`ACCESS_HELP`, `LOGIN_HELP`, `ACCESS_CODE_REQUEST`, `INVITATION_PROBLEM`, `AUTHENTICATION_FAILURE`, `APPROVED`, `APPROVED_WITH_CORRECTIONS`, `CHANGES_REQUESTED`, `QUESTION`, `HOLD`, `STRIPE_CONNECT_HELP`, `DIRECT_DEPOSIT_HELP`, `FILE_RECEIVED`, `ACKNOWLEDGMENT_ONLY`, `GENERAL_SUPPORT`, `UNKNOWN`.

## Authority Rule

Intent recognition does not itself create lifecycle authority.

## Sean Regression

Text: `Thank you, I have received the files and please approve them. Also can May I have the Authors central access code?`

Classification: `ACCESS_SUPPORT_REQUEST` with acknowledgment-only review context.

Lifecycle action: `CREATE_ACCESS_RECOVERY_EVENT`.

Approval recorded: NO.
