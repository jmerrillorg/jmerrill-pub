# INT-PUB-005 ACS Email Relay Plan

## Why This Relay Is Needed

INT-PUB-005 Flow B needs to send the author acknowledgment email through Azure Communication Services Email. The tenant's Power Automate action catalog exposes Azure Communication Services SMS and Azure Communication Services Identity, but it does not expose an Azure Communication Services Email send action. Outlook, Mail, Gmail, Resend, and similar email fallbacks are not approved for this acknowledgment path.

The relay gives Flow B a governed HTTPS endpoint that sends through ACS Email only, while keeping ACS credentials out of Power Automate.

## Power Automate Connector Block

Validated in the JM1-Core Power Automate designer:

- Microsoft Dataverse trigger is available.
- Azure Communication Services SMS connector is available.
- Azure Communication Services Identity connector is available.
- Azure Communication Services Email send action is not visible in the action catalog.
- Mail, Office 365 Outlook, Gmail, and Resend appeared in email searches, but are out of scope.

## Relay Contract

Endpoint:

`POST /api/send-author-acknowledgment`

Required request header:

`x-jm1-relay-key: <secret value stored in Azure Function settings and Power Automate secure configuration>`

Request body:

```json
{
  "reference": "JMP-INT-YYYYMM-XXXXXX",
  "to": "author@example.com",
  "firstName": "First",
  "projectTitle": "Book Title",
  "intakeChannel": "INT-PUB-005 /join"
}
```

Validation:

- Reject missing `reference`.
- Reject missing or invalid `to`.
- Reject `intakeChannel` unless it exactly equals `INT-PUB-005 /join`.
- Reject missing `firstName`.
- If `projectTitle` is missing or blank, use explicit fallback `your book`.
- Reject missing or invalid relay authentication.

Safe response fields only:

```json
{
  "status": "accepted",
  "operationId": "provider-operation-id",
  "reference": "JMP-INT-YYYYMM-XXXXXX"
}
```

Error response shape:

```json
{
  "status": "error",
  "code": "SAFE_ERROR_CODE",
  "reference": "JMP-INT-YYYYMM-XXXXXX"
}
```

## Security Model

- ACS credentials are stored only in Azure Function App settings or Key Vault references.
- Power Automate stores only the relay endpoint URL and relay API key as secure values.
- The relay requires `x-jm1-relay-key`.
- Azure Functions host auth can remain `anonymous` because the custom relay key is mandatory, or it can be set to Function-level auth in addition to the custom key if JM1 wants a second gate.
- No ACS keys, connection strings, or relay secrets are committed to source.
- Request bodies are never logged.
- Email body content is never logged.
- Full recipient email addresses are never logged by the relay.
- Logs may include the intake reference and safe error codes.
- Restrict network access further where feasible:
  - Use Function App access restrictions if Power Automate outbound IP ranges are stable enough for the selected region.
  - Prefer private networking only if Flow B can reach it through approved infrastructure.
  - Enable Application Insights sampling and retention consistent with JM1 telemetry policy.

## Environment Variables

Required:

- `JM1_RELAY_API_KEY`: shared relay key expected in `x-jm1-relay-key`.
- `ACS_EMAIL_SENDER`: `DoNotReply@email.jmerrill.one`.

Choose one ACS authentication model:

- `ACS_CONNECTION_STRING`: ACS connection string stored in Azure Function App settings or Key Vault reference.

Preferred when available:

- `ACS_ENDPOINT`: ACS endpoint, for example `https://acs-jm1-core.communication.azure.com`.
- Managed identity enabled on the Function App.
- RBAC role assignment that permits ACS Email sending for the Function App managed identity.

Optional:

- `APPLICATIONINSIGHTS_CONNECTION_STRING`: Application Insights telemetry.

## Azure Resources

Suggested resources:

- Resource group: `rg-jm1-communications`
- Function App: `func-jm1-acs-email-relay`
- Runtime: Azure Functions v4, Node.js 20 or 22
- Storage account: create or reuse a governed Function App storage account
- Application Insights: create or reuse a JM1 communications telemetry instance
- ACS resource: `acs-jm1-core`
- Email Communication Service: `email-jm1-core`
- Connected sender: `DoNotReply@email.jmerrill.one`

## Deployment Steps

1. Deploy or create the Function App in `rg-jm1-communications`.
2. Enable system-assigned managed identity if using `ACS_ENDPOINT`.
3. Assign the managed identity the minimum ACS role that allows email send, or configure `ACS_CONNECTION_STRING` as a Key Vault reference.
4. Set Function App settings:
   - `JM1_RELAY_API_KEY`
   - `ACS_EMAIL_SENDER=DoNotReply@email.jmerrill.one`
   - `ACS_ENDPOINT` or `ACS_CONNECTION_STRING`
   - `APPLICATIONINSIGHTS_CONNECTION_STRING` if not already wired
5. Deploy `azure-functions/acs-email-relay`.
6. Confirm the endpoint is reachable at:
   - `https://func-jm1-acs-email-relay.azurewebsites.net/api/send-author-acknowledgment`
7. Run a direct controlled test.
8. Only after direct relay validation, build Flow B to call the relay.

Example Azure CLI outline:

```bash
cd azure-functions/acs-email-relay
npm ci
npm run lint
npm test
func azure functionapp publish func-jm1-acs-email-relay
```

## Flow B Integration Steps

1. Trigger on Publishing Intake modified.
2. Guard:
   - Router Processed = true
   - Router Status = Processed
   - Acknowledgment Sent is not true
   - Acknowledgment Status is blank, Pending, or Deferred
3. Retrieve the row again as a duplicate guard.
4. If already sent, terminate succeeded.
5. Update attempt state:
   - Acknowledgment Status = Pending
   - Acknowledgment Last Attempt On = `utcNow()`
   - Acknowledgment Attempt Count = `coalesce(existing, 0) + 1`
6. Call the relay over HTTP:
   - Method: POST
   - Header: `x-jm1-relay-key`
   - Body fields from the Publishing Intake row
7. On relay success:
   - Acknowledgment Sent = Yes
   - Acknowledgment Sent On = `utcNow()`
   - Acknowledgment Status = Sent
   - Acknowledgment Message ID = relay `operationId`
   - Acknowledgment Error = blank
8. On relay failure:
   - Acknowledgment Status = Exception
   - Acknowledgment Error = safe error code and reference
   - Acknowledgment Last Attempt On = `utcNow()`
9. Write Execution Log success/exception only if the Execution Log schema is confirmed.

## Test Plan

Direct relay test:

```bash
curl -X POST "https://func-jm1-acs-email-relay.azurewebsites.net/api/send-author-acknowledgment" \
  -H "content-type: application/json" \
  -H "x-jm1-relay-key: $JM1_RELAY_API_KEY" \
  -d '{
    "reference": "JMP-INT-202606-RELAY1",
    "to": "jackie+intpub005relaytest@jmerrill.pub",
    "firstName": "Jackie",
    "projectTitle": "TEST - INT-PUB-005 Relay Acknowledgment",
    "intakeChannel": "INT-PUB-005 /join"
  }'
```

Expected direct relay result:

- HTTP 202 or 200 success response from relay.
- Response includes `status=accepted`, `operationId`, and `reference`.
- No full email address or email body appears in Function logs.
- ACS accepts or queues the email.

Flow B test:

- Submit one fresh `/join` inquiry with:
  - Email: `jackie+intpub005flowb001@jmerrill.pub`
  - Book title: `TEST - INT-PUB-005 Flow B Acknowledgment`
- Confirm Flow A creates or links Contact and Lead.
- Confirm Flow B sends one acknowledgment only.
- Confirm Publishing Intake acknowledgment fields update to Sent with message/operation ID.
- Confirm duplicate guard prevents another send on subsequent row modifications.

## Rollback Plan

1. Turn off Flow B.
2. Disable or remove the relay HTTP action from Flow B.
3. Revoke or rotate `JM1_RELAY_API_KEY`.
4. Disable the Function App or remove the route if needed.
5. Keep acknowledgment fields intact for audit continuity.
6. Do not alter Flow A, `/join`, Contact, Lead, Opportunity, Stage 0, or loyalty-tier behavior.

