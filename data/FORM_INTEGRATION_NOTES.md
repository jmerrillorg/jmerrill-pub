# Form Integration Notes

Internal operational note for J Merrill Publishing form routing.

## Current public front door

- `/join` remains the public "Join the Family" inquiry form.
- `/api/join` routes submissions through the shared website form integration layer.
- `/api/join` requires server-side Turnstile verification before validation or Power Automate delivery. Deploy the latest site before relying on this guard in production.
- Publisher-facing notifications are addressed to `publishing@jmerrill.one` by default.
- `/join` is the new/prospective author intake lane and must not be collapsed into `/author/onboarding`.

## Private author onboarding routes

- `/author/onboarding`
- `/author/financial-setup`
- `/author/royalty-setup`

These routes are not listed in public navigation or the sitemap. They use a lightweight access-code gate and should be treated as private operational intake, not account-level authentication.

`/author/onboarding` is the current/accepted author production-spec lane. It is not the INT-PUB-005 `/join` intake lane.

## Azure environment variables

- `FORM_NOTIFICATION_TO`: optional override for notification recipient. Defaults to `publishing@jmerrill.one`.
- `AUTHOR_ONBOARDING_ACCESS_CODE`: required for production private-route and API access control. Local development uses `JMP-AUTHOR-2026` only when `NODE_ENV=development` and this variable is not set.
- `POWER_AUTOMATE_JOIN_URL`: optional route-specific Join form ingestion endpoint.
- `POWER_AUTOMATE_PARTNER_APPLY_URL`: optional route-specific Publishing Partner application endpoint.
- `POWER_AUTOMATE_PARTNER_URL`: legacy alias for the Publishing Partner application endpoint.
- `POWER_AUTOMATE_AUTHOR_ONBOARDING_URL`: optional route-specific author onboarding ingestion endpoint.
- `POWER_AUTOMATE_AUTHOR_FINANCIAL_URL`: optional route-specific financial setup ingestion endpoint.
- `POWER_AUTOMATE_AUTHOR_ROYALTY_URL`: optional route-specific royalty setup ingestion endpoint.
- `POWER_AUTOMATE_NOTIFICATION_URL`: preferred generic notification endpoint for all website forms.
- `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_GRAPH_FROM_USER`: optional Microsoft Graph email sender settings.
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`: optional Resend fallback sender settings.

Do not introduce `DATAVERSE_*` environment variables for these website forms. The website posts only to Power Automate HTTP endpoints.

## Canon runtime sequence

Every route-specific Power Automate flow should follow this sequence:

1. HTTP request received.
2. Create `jm1pub_submission` with status `Received`.
3. Upsert downstream record(s).
4. Update `jm1pub_submission` with lookup IDs and status `Converted`.
5. Send email notification.
6. Return HTTP response to website.

`jm1pub_submission` is the first-write audit anchor for every intake flow.

For `/author/onboarding`, Power Automate must read submitted form values from the nested canonical payload:

- `triggerBody()?['payload']?['bookTitle']`
- `triggerBody()?['payload']?['preferredPrintFormat']`
- `triggerBody()?['payload']?['rightsHolderConfirmed']`

Do not read submitted form values from the root trigger body. Expressions like `triggerBody()['bookTitle']` are legacy/incorrect for this envelope.

Live validation on 2026-06-23 confirmed the canonical `/author/onboarding` flow writes first to Dataverse entity set `jm1pub_submissions`. The `jm1pub_rawpayload` column has a confirmed 2,000-character maximum, so the flow stores `string(triggerBody()?['payload'])` truncated to 2,000 characters. Without this bound, the route-specific flow can return `502 NoResponse` after Dataverse rejects the row.

## Endpoint strategy

The website integration layer uses this order:

1. If the route-specific `POWER_AUTOMATE_*` endpoint is configured, post the canonical envelope there.
2. If no route-specific endpoint is configured, use `POWER_AUTOMATE_NOTIFICATION_URL` as the shared notification fallback.
3. If the shared notification endpoint is not configured, try Microsoft Graph or Resend if those settings exist.
4. If no notification path confirms delivery, the API returns an error instead of showing a false success.

This preserves current production notification behavior while allowing each form to move to route-specific Power Automate ingestion independently.

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

## Canonical website envelope

All website submissions are posted to Power Automate with this structure:

```json
{
  "to": "publishing@jmerrill.one",
  "subject": "Form-specific subject",
  "preview": "Short form summary",
  "formType": "join-family-inquiry",
  "submittedAt": "ISO timestamp",
  "route": "/join",
  "source": "website-join-form",
  "recipient": "publishing@jmerrill.one",
  "canon": {
    "firstWriteAnchor": "jm1pub_submission",
    "receivedStatus": "Received",
    "convertedStatus": "Converted",
    "runtimeSequence": [],
    "internalClassification": {
      "label": "Other",
      "value": 100000009
    }
  },
  "notification": {
    "to": "publishing@jmerrill.one",
    "subject": "Form-specific subject",
    "preview": "Short form summary",
    "required": true
  },
  "payload": {}
}
```

The shared notification flow can continue reading nested values from `payload`, for example:

- `triggerBody()?['payload']?['formType']`
- `triggerBody()?['payload']?['submittedAt']`
- `triggerBody()?['payload']?['internalClassification']?['value']`

For controlled `/author/onboarding` fields, the canonical field value is a stable key. Human-readable labels are supplied separately as `*Label` fields where needed. Power Automate must map the stable key to the confirmed Dataverse integer before writing Choice columns. Do not write display labels into Dataverse Choice columns.

Canonical `/author/onboarding` mapping reference:

- `docs/dataverse/publishing-author-onboarding-choice-mapping.md`

Canonical flow cleanup/status reference:

- `docs/operations/publishing-intake-onboarding-stabilization-2026-06-23.md`

## Internal classification canon

- `Legacy = 100000000`
- `Ministry = 100000001`
- `Business = 100000002`
- `Trade = 100000003`
- `Children = 100000004`
- `Poetry = 100000005`
- `Academic = 100000006`
- `Memoir = 100000007`
- `Fiction = 100000008`
- `Other = 100000009`
