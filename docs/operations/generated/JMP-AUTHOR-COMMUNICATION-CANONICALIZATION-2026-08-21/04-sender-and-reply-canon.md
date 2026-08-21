# Sender And Reply Canon

Last Verified: 2026-08-21T08:22:00Z

## Canonical Publishing Email Identity

| Field | Canonical value |
|---|---|
| Author-facing ACS From | `J Merrill Publishing <publishing@email.jmerrill.one>` |
| Reply-To | `publishing@jmerrill.one` |
| Internal visibility copy | `publishing@jmerrill.one` |

## Production Readback After Remediation

Source: Azure Function App settings.

| Setting | Value |
|---|---|
| ACS_EMAIL_SENDER | publishing@email.jmerrill.one |
| ACS_AUTHOR_RESPONSE_EMAIL_SENDER | publishing@email.jmerrill.one |
| WEBSITE_RUN_FROM_PACKAGE | Present; current deployment package URL expires in 2036 |

## Reply-To Evidence

Relay message construction and regression tests prove `replyTo: publishing@jmerrill.one` for the acknowledgment route and approved author-response route. The Outlook connector displayed delivered sender, body, recipients, and HTML, but did not expose `replyTo`. Direct Graph header lookup was attempted and returned `ErrorAccessDenied`; no credential or token was printed.
