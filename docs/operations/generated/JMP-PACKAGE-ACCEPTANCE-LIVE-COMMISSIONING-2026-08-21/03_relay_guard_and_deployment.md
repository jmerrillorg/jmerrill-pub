# Relay Guard and Deployment

Last verified: 2026-08-21T08:56:44Z

## Implementation

Updated relay:

- `azure-functions/acs-email-relay/src/functions/sendAuthorAcknowledgment.js`

Updated tests:

- `azure-functions/acs-email-relay/test/validation.test.js`

## Relay Enforcement

The existing `send-approved-author-response` route now validates `PACKAGE_ACCEPTANCE_PAYMENT_OPTIONS_V1` payloads for:

- canonical HTML;
- canonical renderer metadata;
- quality gate `PASS`;
- subject includes book title;
- subject does not lead with internal reference or GUID;
- body includes author-facing reference;
- HTML CTA;
- plain-text fallback structure;
- no internal workflow language;
- no numeric tax guess;
- no premature Joined-the-Family / production-start language.

## Production Deployment

Azure Function App: `func-jm1-acs-email-relay`

Resource group: `rg-jm1-communications`

Runtime readback: `Node|22`

Deployment method: Function App zip deployment.

Production readback after deployment:

- state: `Running`
- last modified: `2026-08-21T08:53:57.770000`

## Sender Settings

Before deployment, production app settings were read back without preserving secrets:

- `ACS_EMAIL_SENDER = publishing@email.jmerrill.one`
- `ACS_AUTHOR_RESPONSE_EMAIL_SENDER = publishing@email.jmerrill.one`

