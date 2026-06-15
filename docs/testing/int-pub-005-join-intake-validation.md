# INT-PUB-005 Join Intake Validation Notes

This repo does not currently include Jest, Vitest, Playwright, or another test runner. Validation for the INT-PUB-005 intake adapter is covered by TypeScript-safe utility boundaries, local/API checks, and manual Dataverse verification until a test framework is approved.

## Utility Coverage

Implemented utility boundaries:

- `lib/publishing/intake/schema.ts`
- `lib/publishing/intake/sanitize.ts`
- `lib/publishing/intake/reference.ts`
- `lib/publishing/intake/rateLimit.ts`
- `lib/publishing/intake/idempotency.ts`
- `lib/publishing/intake/turnstile.ts`
- `lib/publishing/intake/dataverse.ts`
- `lib/publishing/intake/dataverseMapping.ts`
- `lib/publishing/intake/deadLetter.ts`

## Required Environment Variables

Server-side Dataverse adapter variables:

- `DATAVERSE_TENANT_ID`
- `DATAVERSE_CLIENT_ID`
- `DATAVERSE_CLIENT_SECRET`
- `DATAVERSE_RESOURCE_URL`
- `DATAVERSE_ENVIRONMENT_URL`
- `DATAVERSE_WEB_API_BASE_URL`
- `DATAVERSE_PUBLISHING_INTAKE_ENTITY_SET`

Confirmed non-secret values for JM1-Core:

```text
DATAVERSE_TENANT_ID=352d075e-8e17-4169-9f8e-22e6946ce66d
DATAVERSE_CLIENT_ID=71ec4dd0-d261-4ffc-9f5a-626d885ecc85
DATAVERSE_RESOURCE_URL=https://jm1hq.crm.dynamics.com
DATAVERSE_ENVIRONMENT_URL=https://jm1hq.crm.dynamics.com
DATAVERSE_WEB_API_BASE_URL=https://jm1hq.crm.dynamics.com/api/data/v9.2
DATAVERSE_PUBLISHING_INTAKE_ENTITY_SET=jm1_publishingintakes
```

Do not commit or paste `DATAVERSE_CLIENT_SECRET`. Place it only in the secure deployment environment.

Turnstile and intake controls:

- `TURNSTILE_SECRET_KEY`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `INTAKE_ALLOWED_ORIGINS`
- `INTAKE_RATE_LIMIT_ENABLED`

Optional dead-letter variables:

- `AZURE_STORAGE_CONNECTION_STRING`
- `INTAKE_DEADLETTER_QUEUE_NAME`

The current dead-letter adapter returns `not_configured` when these settings are absent. If they are present, the adapter remains explicit and fails with `dead_letter_adapter_not_implemented_without_azure_storage_sdk` until an approved queue implementation is added.

## Local Validation Without Exposing Secrets

1. Copy `.env.example` to `.env.local`.
2. Add non-secret Dataverse values from the confirmed list above.
3. Add `DATAVERSE_CLIENT_SECRET` only in your local `.env.local`; never paste it into chat, docs, GitHub, or terminal logs.
4. Leave Turnstile unset for local non-production validation, or use the development client token path.
5. Run `npm run type-check`, `npm run lint`, and `npm run build`.

In non-production, if Dataverse credentials are missing, the adapter returns `skipped` and the API can still validate the request path without writing a row.

## Manual API Test Payload

Use `POST /api/publishing/intake` with JSON matching the INT-PUB-005 body. Replace the UUID and Turnstile token for each run.

```json
{
  "firstName": "Test",
  "lastName": "Author",
  "email": "jackie+intpub005test@jmerrill.pub",
  "phone": "6140000000",
  "bookTitle": "TEST - INT-PUB-005 Publishing Intake",
  "workType": "Full-length Book",
  "genre": "Inspirational nonfiction",
  "wordCount": 50000,
  "manuscriptStatus": "Complete",
  "manuscriptUrl": "https://example.com/manuscript",
  "publishedBefore": "First book",
  "bookDescription": "This is a safe test submission used to validate the INT-PUB-005 Dataverse intake adapter path.",
  "referralSource": "Search",
  "additionalNotes": "Test submission only. Do not route downstream.",
  "consent": true,
  "turnstileToken": "development-turnstile-token",
  "idempotencyKey": "00000000-0000-4000-8000-000000000005"
}
```

## Expected Successful API Response

When Dataverse writes succeed, the public API response remains:

```json
{
  "status": "received",
  "reference": "JMP-INT-YYYYMM-XXXXXX"
}
```

Expected status: `201`.

## Expected Dataverse Row Fields

Verify the created row in `jm1_publishingintakes` / Publishing Intake:

- `jm1_name`
- `jm1_firstname`
- `jm1_lastname`
- `jm1_email`
- `jm1_mobilephone`
- `jm1_projecttitle`
- `jm1_manuscripttype`
- `jm1_genresubject`
- `jm1_estimatedwordcount`
- `jm1_manuscriptstatusatintake`
- `jm1_manuscripturl`
- `jm1_publishedbefore`
- `jm1_purpose`
- `jm1_referralsource`
- `jm1_additionalnotes`
- `jm1_consenttocontact`
- `jm1_intakereferencecode`
- `jm1_intakechannel`
- `jm1_idempotencykey`
- `jm1_consenttimestamp`
- `jm1_wordcountsource`

Expected primary name format:

```text
JMP-INT-YYYYMM-XXXXXX — [Book Title]
```

The primary name is capped at 100 characters by the website adapter unless a different Dataverse max length is confirmed.

## Web API Attribute Name Requirement

Dataverse Web API create payloads must use logical attribute names from metadata, not display names or schema names.

The INT-PUB-005 mapping was verified against Dataverse metadata for `jm1_publishingintake`. The JSON payload should use names such as `jm1_name`, `jm1_firstname`, and `jm1_intakereferencecode`. Schema-style names such as `jm1_Name`, `jm1_FirstName`, or `jm1_IntakeReferenceCode` should not be used in the Web API payload unless Dataverse metadata confirms that exact value is the attribute logical name.

Choice values are mapped to Dataverse numeric option values:

- `jm1_manuscripttype`: `Full-length Book` -> `196650000`
- `jm1_publishedbefore`: `First book` -> `835500000`

## Expected Failure Behavior

- Missing required fields return `400` with `status: "invalid"`.
- Invalid email returns `400`.
- Invalid work type, manuscript status, publishing history, or referral source returns `400`.
- Turnstile failure returns `400` before rate limit, validation, idempotency, or adapter writes.
- Replaying the same idempotency key within 24 hours after a received submission returns `409` with `status: "duplicate"`.
- Dataverse retryable failures are retried up to two additional times with backoff.
- If Dataverse fails and dead-letter is successfully enqueued, the API still returns a server-side failure response; `201` is reserved for Dataverse create success.
- If Dataverse fails and dead-letter is not configured or enqueue fails, production returns a server-side failure response with `status: "error"`.
- Client-visible errors do not expose PII or Dataverse internals.

## Safe Troubleshooting Diagnostics

When the public form shows the generic error, open DevTools > Network > `/api/publishing/intake` > Response.

Capture only:

- HTTP status
- `status`
- `code`
- `detail`
- `reference`

Do not capture:

- request headers
- cookies
- Turnstile token
- email
- phone
- full name
- full request payload

Diagnostic interpretation:

| Diagnostic | Meaning |
|---|---|
| `dataverse_configuration_missing` | Azure app setting missing. |
| `dataverse_token_failed` | Tenant, client ID, client secret, or API permission issue. |
| `dataverse_write_failed:400` | Dataverse payload, column, choice, or required field issue. |
| `dataverse_write_failed:401` / `dataverse_write_failed:403` | Dataverse application user or security role issue. |
| `turnstile_verification_failed` | Turnstile secret, domain, or server verification issue. |
| `unexpected_exception` | Inspect the code path and safe server logs. |

## Manual Dataverse Verification Checklist

- Confirm exactly one Publishing Intake row is created per successful submission.
- Confirm no Contact, Lead, Opportunity, execution log, acknowledgment email, loyalty-tier logic, Stage 0 diagnostic, or Power Automate Flow A behavior is triggered by the website.
- Confirm `jm1_name` is populated as `JMP-INT-YYYYMM-XXXXXX — [Book Title]`.
- Confirm `jm1_intakereferencecode` matches the API response reference.
- Confirm `jm1_idempotencykey` stores the submitted idempotency key.
- Confirm `jm1_consenttimestamp` is an ISO server receipt timestamp.
- Confirm optional blank fields are omitted or blank, not filled with placeholder text.
- Confirm the application user is `JM1-PUB-INTAKE-WEBAPI` with the `JM1 Publishing Intake API - Create Only` role.

## Idempotency Note

Current idempotency memory is process-local. It is acceptable for first activation testing only. A durable idempotency store should be added before relying on idempotency across scaled instances, restarts, or multi-region runtime behavior.

## Dataverse Boundary

The website/API writes only one row to `jm1_publishingintakes`. It does not create or match Contacts, Leads, Opportunities, acknowledgments, loyalty-tier records, execution logs, Stage 0 diagnostics, or downstream Power Automate behavior.

## Flow B - Author Acknowledgment Email

Flow B is the governed acknowledgment process for validated INT-PUB-005 intake rows after Flow A has processed the Publishing Intake record.

- Flow name: `INT-PUB-005 Author Acknowledgment Email`
- Flow link: https://make.powerapps.com/environments/dc4b2a13-3dbb-e0d1-95b8-f0e7d3a26e10/solutions/e0991664-1b94-f011-b4cc-7ced8d1cd64f/objects/cloudflows/ecbfd3a1-5368-f111-a826-00224820105b
- Flow ID: `ecbfd3a1-5368-f111-a826-00224820105b`
- Status: active, `statecode: 1`, `statuscode: 2`
- Relay endpoint: `https://func-jm1-acs-email-relay.azurewebsites.net/api/send-author-acknowledgment`
- Relay key handling: `jm1_INTPUB005RelayApiKey` resolves through a Power Platform secret environment variable backed by Azure Key Vault secret `jm1-int-pub-005-relay-api-key`
- Sender: `DoNotReply@email.jmerrill.one`

Validated controlled test:

- Reference: `JMP-INT-202606-UZ3AL5`
- Safe relay result: `status: accepted`, `reference: JMP-INT-202606-UZ3AL5`, `operationId: null`, `messageId: null`
- Acknowledgment sent: `jm1_acknowledgmentsent: true`
- Acknowledgment status: `jm1_acknowledgmentstatus: 835500001`
- Acknowledgment sent on: `2026-06-15T00:53:29Z`
- Acknowledgment attempt count: `1`
- Acknowledgment last attempt on: `2026-06-15T00:53:25Z`
- Acknowledgment error: `null`
- Acknowledgment message ID: `null`

Duplicate guard:

- A self-triggered second run terminated before retrieving the relay key or calling the relay.
- `Get_Relay_Key` and `Call_ACS_Email_Relay` were skipped in the duplicate-guard run.

Boundaries:

- No Opportunity was created.
- No Stage 0 diagnostic was created by Flow B.
- No historical rows were processed.
- No website changes or Flow A changes were made for Flow B.
- No fallback email provider was used.

Execution Log integration for Flow B was deferred because the schema was not fully confirmed. The Publishing Intake acknowledgment fields are the source of truth for this pass.

## Flow C - Stage 0 Diagnostic Handoff

Flow C is the separate governed handoff process for INT-PUB-005 Stage 0 diagnostic readiness. It is intentionally separate from Flow A and Flow B.

- Flow name: `INT-PUB-005 Stage 0 Diagnostic Handoff`
- Flow link: https://make.powerapps.com/environments/dc4b2a13-3dbb-e0d1-95b8-f0e7d3a26e10/solutions/e0991664-1b94-f011-b4cc-7ced8d1cd64f/objects/cloudflows/c8ddc3f8-5668-f111-a826-000d3a14673b
- Flow ID: `c8ddc3f8-5668-f111-a826-000d3a14673b`
- Status: active, `statecode: 1`, `statuscode: 2`
- Solution: `JM1_Publishing`
- Purpose: create a Stage 0 diagnostic handoff record only after Flow A and Flow B have completed for a fresh INT-PUB-005 `/join` intake row.

Trigger condition:

```text
@and(equals(triggerOutputs()?['body/jm1_intakechannel'], 'INT-PUB-005 /join'), equals(triggerOutputs()?['body/jm1_routerprocessed'], true), equals(triggerOutputs()?['body/jm1_routerstatus'], 196650002), equals(triggerOutputs()?['body/jm1_acknowledgmentsent'], true), equals(triggerOutputs()?['body/jm1_acknowledgmentstatus'], 835500001), not(equals(triggerOutputs()?['body/jm1_stage0handoffcreated'], true)), or(equals(triggerOutputs()?['body/jm1_stage0handoffstatus'], null), equals(triggerOutputs()?['body/jm1_stage0handoffstatus'], 835500000), equals(triggerOutputs()?['body/jm1_stage0handoffstatus'], 835500001), equals(triggerOutputs()?['body/jm1_stage0handoffstatus'], 835500004)))
```

Duplicate guard:

- The flow re-reads the Publishing Intake row at start.
- If `jm1_stage0handoffcreated` is `true` or `jm1_stage0handoffstatus` is `835500002`, the flow terminates succeeded before creating another diagnostic handoff.
- The controlled test created exactly one diagnostic handoff record for the intake.

Stage 0 handoff fields on Publishing Intake:

| Display name | Logical name | Type | Values |
|---|---|---|---|
| Stage 0 Handoff Status | `jm1_stage0handoffstatus` | Choice | `835500000` Not Ready; `835500001` Ready; `835500002` Handed Off; `835500003` Exception; `835500004` Deferred |
| Stage 0 Handoff Created | `jm1_stage0handoffcreated` | Yes/No | `false` No; `true` Yes |
| Stage 0 Handoff Created On | `jm1_stage0handoffcreatedon` | DateTime | User local date and time |
| Stage 0 Handoff Error | `jm1_stage0handofferror` | Multiple lines of text | Max length 2000 |
| Stage 0 Diagnostic | `jm1_stage0diagnostic` | Lookup | Target: `jm1pub_editorialdiagnostic` |
| Stage 0 Handoff Attempt Count | `jm1_stage0handoffattemptcount` | Whole number | Minimum 0 |
| Stage 0 Handoff Last Attempt On | `jm1_stage0handofflastattempton` | DateTime | User local date and time |

Diagnostic table contract used for handoff:

- Table: `jm1pub_editorialdiagnostic`
- Entity set: `jm1pub_editorialdiagnostics`
- Required handoff fields used: `jm1pub_name`, `jm1pub_diagnosticreason`, `jm1pub_diagnosticstatus`, `jm1pub_diagnosticversion`, `jm1pub_iscurrentdiagnostic`, `jm1pub_publishingintake`, and `jm1pub_lead`
- Optional lookup populated when present: `jm1pub_authorcontact`
- Diagnostic reason: `196650000` Initial
- Diagnostic status: `196650000` Pending
- Diagnostic version: `1`
- Diagnostic summary notes that the row is handoff-only and diagnostic execution was not run by Flow C.

Controlled Stage 0 test:

- `/join` reference: `JMP-INT-202606-IP82OF`
- Publishing Intake ID: `22da13b5-5768-f111-a826-000d3a14673b`
- Contact ID: `8dded0b4-5768-f111-a826-00224820105b`
- Lead ID: `0a46f4b4-5768-f111-a826-6045bdd69678`
- Diagnostic handoff ID: `e8b8c5be-5768-f111-a826-7c1e525b15c2`
- Stage 0 Handoff Created: `true`
- Stage 0 Handoff Status: `835500002`
- Stage 0 Handoff Created On: `2026-06-15T01:15:54Z`
- Stage 0 Handoff Attempt Count: `1`
- Stage 0 Handoff Last Attempt On: `2026-06-15T01:15:54Z`
- Stage 0 Handoff Error: `null`
- Opportunity count for this test: `0`
- Diagnostic handoff count for this intake: `1`

Observed run results:

- Flow A `INT-PUB-005 Intake Router`: succeeded for the controlled test.
- Flow B `INT-PUB-005 Author Acknowledgment Email`: one send run succeeded and a later duplicate-guard run skipped relay key retrieval and the ACS relay call.
- Flow C `INT-PUB-005 Stage 0 Diagnostic Handoff`: one run succeeded; `Create_Stage0_Diagnostic_Handoff` and `Update_Intake_Stage0_Handoff_Created` succeeded; exception and missing-field updates were skipped.

AI diagnostic execution:

- `JM1 PUB - Run Diagnostic AI Assessment` had no run during the controlled Stage 0 handoff window.
- `jm1_airunlogs`, `jm1_aiactivitylogs`, and `jm1_airequestlogs` had zero rows during the controlled Stage 0 handoff window.
- Flow C does not call Foundry, OpenAI, child diagnostic flows, or any AI diagnostic execution endpoint.

Execution Log integration for Flow C was deferred for the same reason as Flow B: the schema was not fully confirmed for this governed pass. The Publishing Intake Stage 0 handoff fields and the linked Editorial Diagnostic row are the source of truth.

## Email-Submitted Manuscript Before /join

When an author sends a manuscript by email before completing `/join`, the email submission does not replace the governed intake record. Ask the author to complete the public intake form so the project can enter the validated INT-PUB-005 pipeline.

Recommended author-facing language:

> Please complete our author intake form so we can place your manuscript into our governed review process. Since you already sent the manuscript by email, just note that in the additional notes section.

Author intake form: https://jmerrill.pub/join

Operational rule:

1. Ask the author to complete https://jmerrill.pub/join.
2. Tell the author to note in Additional Notes that the manuscript was already submitted by email.
3. `/join` remains the governed intake record of truth.
4. Flow A should match/create Contact and create/link Lead.
5. Flow B should send acknowledgment.
6. Flow C should create Stage 0 diagnostic handoff.
7. The emailed manuscript remains an external/manual asset until attached through the approved manuscript asset process.
8. Do not manually create a duplicate intake unless `/join` cannot be completed.
9. Do not create Opportunity at this stage.
10. Do not run AI diagnostic execution until Flow D is approved and built.

Internal operator note:

- If the author is already known to JMP, Flow A should match Contact by email.
- A new Lead is still appropriate for a new manuscript/project inquiry.
- If this is already an active contracted/onboarded project, do not ask for `/join` unless intake data is missing; handle the manuscript against the existing project record.
