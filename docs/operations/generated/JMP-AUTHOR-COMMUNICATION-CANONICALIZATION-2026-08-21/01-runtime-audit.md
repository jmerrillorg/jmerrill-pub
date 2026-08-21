# Runtime Audit

Last Verified: 2026-08-21T08:22:00Z

## Production State Before Remediation

Source: Azure Function App settings for `func-jm1-acs-email-relay` in `rg-jm1-communications`.

| Setting | Readback |
|---|---|
| ACS_EMAIL_SENDER | DoNotReply@email.jmerrill.one |
| ACS_AUTHOR_RESPONSE_EMAIL_SENDER | publishing@email.jmerrill.one |
| WEBSITE_RUN_FROM_PACKAGE | SAS package URL present; expiry embedded in URL |

## Finding

The production relay had split sender semantics: author responses used the Founder-approved sender, but the acknowledgment/internal relay path still expected `DoNotReply@email.jmerrill.one`.

The Function App also depended on `WEBSITE_RUN_FROM_PACKAGE` with an expiring SAS URL, leaving the relay vulnerable to package expiry.

