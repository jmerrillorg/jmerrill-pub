# Form Integration Notes

Internal operational note for J Merrill Publishing form routing.

## Current public front door

- `/join` remains the public "Join the Family" inquiry form.
- `/api/join` now routes submissions through the shared website form integration layer.
- Publisher-facing notifications are addressed to `publishing@jmerrill.one` by default.

## Private author onboarding routes

- `/author/onboarding`
- `/author/financial-setup`
- `/author/royalty-setup`

These routes are not listed in public navigation or the sitemap. They use a lightweight access-code gate and should be treated as private operational intake, not account-level authentication.

## Azure environment variables

- `FORM_NOTIFICATION_TO`: optional override for notification recipient. Defaults to `publishing@jmerrill.one`.
- `AUTHOR_ONBOARDING_ACCESS_CODE`: required for production private-route and API access control. Local development uses `JMP-AUTHOR-2026` only when `NODE_ENV=development` and this variable is not set.
- `POWER_AUTOMATE_JOIN_URL`: optional Join form Power Automate/Dataverse ingestion endpoint.
- `POWER_AUTOMATE_AUTHOR_ONBOARDING_URL`: optional author onboarding ingestion endpoint.
- `POWER_AUTOMATE_AUTHOR_FINANCIAL_URL`: optional financial setup ingestion endpoint.
- `POWER_AUTOMATE_AUTHOR_ROYALTY_URL`: optional royalty setup ingestion endpoint.
- `POWER_AUTOMATE_NOTIFICATION_URL`: preferred generic notification endpoint for all website forms.
- `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_GRAPH_FROM_USER`: optional Microsoft Graph email sender settings.
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`: optional Resend fallback sender settings.

## Dataverse status

The website does not write directly to Dataverse tables yet. Form submissions are Dataverse-ready and can be posted into Power Automate flows now, then mapped into Dataverse when the final table schema is ready.

## Notification status

Notifications are supported through the shared integration layer. In production, configure one of:

- `POWER_AUTOMATE_NOTIFICATION_URL` preferred
- Microsoft Graph sender settings
- Resend sender settings

Confirmed notification delivery now requires a dedicated sender response. If a form-specific Power Automate URL is configured but no separate notification sender exists, the notification instruction is still included in the Dataverse/Power Automate payload, but the website will not mark the submission as fully delivered because email delivery is unverified.

If a `/join` submission succeeds but no email arrives at `publishing@jmerrill.one`, the site code has accepted the submission but production notification delivery is not active. Most likely causes:

- `POWER_AUTOMATE_NOTIFICATION_URL` is not configured.
- Microsoft Graph or Resend sender settings are not configured.
- `POWER_AUTOMATE_JOIN_URL` is configured, but that flow does not send the included notification email.

For the quickest production fix, create a Power Automate HTTP-triggered notification flow and set `POWER_AUTOMATE_NOTIFICATION_URL` in Azure Static Web Apps app settings.

The preferred Power Automate notification flow should accept this JSON shape:

```json
{
  "to": "publishing@jmerrill.one",
  "subject": "New Join the Family inquiry: Example Author",
  "preview": "Example Author submitted a Join the Family inquiry.",
  "payload": {}
}
```

The flow should send an email to the provided `to` value and return an HTTP 2xx response only after the send-mail action succeeds.
