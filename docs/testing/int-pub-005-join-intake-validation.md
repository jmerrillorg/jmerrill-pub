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

## Flow D - Stage 0 Diagnostic Execution

Flow D is the separate governed execution layer for INT-PUB-005 Stage 0 diagnostics. It is intentionally separate from Flow C: Flow C creates the handoff record, and Flow D owns execution readiness.

- Flow name: `INT-PUB-005 Stage 0 Diagnostic Execution`
- Flow link: https://make.powerapps.com/environments/dc4b2a13-3dbb-e0d1-95b8-f0e7d3a26e10/solutions/e0991664-1b94-f011-b4cc-7ced8d1cd64f/objects/cloudflows/bad14262-9068-f111-a826-000d3a14673b
- Flow ID: `bad14262-9068-f111-a826-000d3a14673b`
- Status: active, `statecode: 1`, `statuscode: 2`
- Solution: `JM1_Publishing`
- Purpose: detect a fresh INT-PUB-005 Stage 0 diagnostic handoff and mark diagnostic execution as deferred/needs human review until manuscript asset attachment and a side-effect-free AI execution contract are approved.

Trigger condition:

```text
@and(startsWith(triggerOutputs()?['body/jm1pub_name'], 'INT-PUB-005 Stage 0 Handoff'), equals(triggerOutputs()?['body/jm1pub_diagnosticreason'], 196650000), equals(triggerOutputs()?['body/jm1pub_diagnosticstatus'], 196650000), or(equals(triggerOutputs()?['body/jm1_diagnosticexecutionstatus'], null), equals(triggerOutputs()?['body/jm1_diagnosticexecutionstatus'], 835500000), equals(triggerOutputs()?['body/jm1_diagnosticexecutionstatus'], 835500005)), or(equals(triggerOutputs()?['body/jm1_diagnosticattemptcount'], null), less(triggerOutputs()?['body/jm1_diagnosticattemptcount'], 1)))
```

Duplicate guard:

- Flow D re-reads the Editorial Diagnostic record at the start of the run.
- If `jm1_diagnosticexecutionstatus` is `835500002`, `jm1_diagnosticexecutioncompletedon` is populated, or completed output already exists with completed status, the flow terminates succeeded.
- Flow D does not retry after the first readiness/deferred attempt unless the retry threshold is explicitly changed later.

Diagnostic execution fields on Editorial Diagnostic:

| Display name | Logical name | Type | Values |
|---|---|---|---|
| Diagnostic Execution Status | `jm1_diagnosticexecutionstatus` | Choice | `835500000` Ready; `835500001` Processing; `835500002` Completed; `835500003` Exception; `835500004` Needs Human Review; `835500005` Deferred |
| Diagnostic Execution Started On | `jm1_diagnosticexecutionstartedon` | DateTime | User local date and time |
| Diagnostic Execution Completed On | `jm1_diagnosticexecutioncompletedon` | DateTime | User local date and time |
| Diagnostic Execution Error | `jm1_diagnosticexecutionerror` | Multiple lines of text | Max length 2000 |
| Diagnostic Attempt Count | `jm1_diagnosticattemptcount` | Whole number | Minimum 0; maximum 2147483647 |
| Diagnostic Last Attempt On | `jm1_diagnosticlastattempton` | DateTime | User local date and time |
| Diagnostic Output Summary | `jm1_diagnosticoutputsummary` | Multiple lines of text | Max length 2000 |
| Diagnostic Recommendation | `jm1_diagnosticrecommendation` | Multiple lines of text | Max length 2000 |
| Diagnostic Confidence | `jm1_diagnosticconfidence` | Decimal | Precision 2; minimum 0; maximum 1 |
| Diagnostic Requires Human Review | `jm1_diagnosticrequireshumanreview` | Yes/No | `false` No; `true` Yes |
| Diagnostic Model / Agent ID | `jm1_diagnosticagentid` | Single line of text | Max length 100 |
| Diagnostic Correlation ID | `jm1_diagnosticcorrelationid` | Single line of text | Max length 100 |

Confirmed diagnostic table:

- Display name: `Editorial Diagnostic`
- Logical name: `jm1pub_editorialdiagnostic`
- Entity set: `jm1pub_editorialdiagnostics`
- Existing handoff status field: `jm1pub_diagnosticstatus`
- Existing handoff status values: `196650000` Pending; `196650001` In Progress; `196650002` Complete; `196650003` Auto-Routed; `196650004` Awaiting Jackie Review; `196650005` Jackie Approved; `196650006` Jackie Redirected; `196650007` Declined; `196650008` Hard Stop
- Existing handoff reason field: `jm1pub_diagnosticreason`
- Existing handoff reason value used by Flow C: `196650000` Initial
- Existing output fields include `jm1pub_diagnosticsummary`, `jm1pub_diagnosticjson`, `jm1pub_airawresponse`, `jm1pub_aiconfidencescore`, `jm1pub_confidence`, `jm1pub_editorialrecommendation`, `jm1pub_recommendedpackage`, and routing/review fields.
- Existing references include `jm1pub_publishingintake`, `jm1pub_lead`, optional `jm1pub_authorcontact`, and optional `jm1pub_project`.
- Existing Execution Log lookup: `jm1pub_executionlogentry`.

AI execution contract status:

- Existing flow found: `JM1 PUB - Run Diagnostic AI Assessment`, ID `56d5901d-874b-f111-bec7-6045bdd69678`, active.
- Existing prompt template found: `Stage 0 Editorial Diagnostic`, prompt type `196650000`, prompt version `v1.0.0`, model deployment alias `jm1-pub-diagnostic-primary`, JSON schema version `v1.0.0`.
- Existing environment-variable contract names found for Azure OpenAI endpoint, key, API version, and deployment alias.
- Flow D does not call the existing AI assessment flow because that flow includes Opportunity creation and Execution Log actions that are outside the approved INT-PUB-005 Flow D scope.
- Flow D does not call Foundry, Azure OpenAI, OpenAI, or any AI endpoint.
- Flow D marks diagnostics as `Deferred` with `Diagnostic Requires Human Review = true` until manuscript asset attachment and a side-effect-free AI execution contract are approved.

Controlled test:

- No Flow D controlled `/join` test was run in this pass.
- Reason: the AI execution contract is not confirmed for INT-PUB-005 because the only discovered diagnostic execution flow has disallowed side effects.
- No historical Publishing Intake rows were processed.

Execution Log behavior:

- Execution Log writes remain deferred for Flow D because the execution-log contract was not confirmed for this governed pass.
- Flow D uses the new diagnostic execution fields on `jm1pub_editorialdiagnostic` as the source of truth.

Boundaries:

- No Opportunity is created by Flow D.
- No author email is sent by Flow D.
- No historical rows are processed by Flow D.
- No duplicate completed diagnostic execution is allowed.
- No uncontrolled AI execution is allowed.
- No full prompt, full manuscript text, endpoint key, header, token, cookie, or secret is logged or stored by this documentation.

## Email-Submitted Manuscript Before /join

When an author sends a manuscript by email before completing `/join`, the email submission does not replace the governed intake record. Ask the author to complete the public intake form so the project can enter the validated INT-PUB-005 pipeline.

Recommended author-facing language:

> Please complete our author intake form so we can place your manuscript into our governed review process. Since you already sent the manuscript by email, just note that in the additional notes section.

Author intake form: https://jmerrill.pub/join

Operational rule:

1. Ask the author to complete https://jmerrill.pub/join.
2. Tell the author to note in Additional Notes that the manuscript was already submitted by email.
3. After the `/join` reference is created and the intake reference code is assigned, save the manuscript to:
   ```
   Publishing Team / Documents / 01_Pre-Pipeline / 01_Manuscript-Review / 00_Intake-Manuscripts / [Intake Reference Code] / Original
   ```
4. Update the Editorial Diagnostic record with the manuscript asset fields:
   - `jm1_manuscriptasseturl` — SharePoint URL of the saved file
   - `jm1_manuscriptfilename` — original filename
   - `jm1_manuscriptfiletype` — file extension (e.g. `docx`, `pdf`)
   - `jm1_manuscriptattachedon` — date/time attached
   - `jm1_manuscriptattachedby` — operator name or identifier
   - `jm1_manuscriptassetstatus` — set to `Received` or `Attached` as appropriate
5. Do not run AI diagnostic execution until Jackie or an assigned editorial operator sets `jm1_manuscriptassetstatus` to `Approved` and `jm1_manuscriptapprovedfordiagnostic` to `Yes`.
6. Do not create an Opportunity at this stage.
7. `/join` remains the governed intake record of truth.
8. Flow A should match/create Contact and create/link Lead.
9. Flow B should send acknowledgment.
10. Flow C should create Stage 0 diagnostic handoff.
11. Do not manually create a duplicate intake unless `/join` cannot be completed.

Internal operator note:

- If the author is already known to JMP, Flow A should match Contact by email.
- A new Lead is still appropriate for a new manuscript/project inquiry.
- If this is already an active contracted/onboarded project, do not ask for `/join` unless intake data is missing; handle the manuscript against the existing project record.

## Flow D — Manuscript Asset Gate

### Gate logic

Flow D enforces a three-condition manuscript asset gate before any AI execution is permitted. The gate is evaluated in `Condition_Manuscript_Asset_Ready` inside `Scope_Try_Preflight_Diagnostic`, after the existing required-data preflight passes.

Flow D may proceed to AI execution only when all three conditions are simultaneously true:

| Condition | Required value |
|---|---|
| `jm1_manuscriptassetstatus` | `3` (Approved) |
| `jm1_manuscriptapprovedfordiagnostic` | `true` (Yes) |
| `jm1_manuscriptasseturl` | populated (not null and not empty) |

If any condition is not met, Flow D:

1. Sets `jm1_diagnosticexecutionstatus` = `835500005` (Deferred)
2. Sets `jm1_diagnosticexecutionerror` = `Manuscript asset not attached or not approved.`
3. Sets `jm1_diagnosticlastattempton` = `utcNow()`
4. Sets `jm1_diagnosticrequireshumanreview` = `true`
5. Sets handoff status = `196650004` (Awaiting Jackie Review)
6. Terminates cleanly with status Succeeded

No AI is called. No Opportunity is created. No author email is sent.

### Changes made to Flow D in this pass

- `Condition_Manuscript_Asset_Ready` added to the else branch of `Condition_Missing_Required_Data_Or_Contract`
- The three always-true `jm1pub_manuscriptpresent` clauses removed from `Condition_Missing_Required_Data_Or_Contract` (they blocked the gate from being reached; the new gate replaces them)
- Flow D remains active: `statecode: 1`, `statuscode: 2`, `state: Started`
- No AI execution flow called
- No Opportunity created
- No author email sent

### Controlled test — 2026-06-15

Test diagnostic record: `INT-PUB-005 Stage 0 Handoff — TEST-FLOWD-GATE-003`

Diagnostic ID: `6490a7de-b868-f111-a826-000d3a14673b`

Linked intake: `JMP-INT-202606-IP82OF` (reference from prior Stage 0 controlled test)

Test conditions: no manuscript asset fields set (`jm1_manuscriptassetstatus` = null, `jm1_manuscriptapprovedfordiagnostic` = false, `jm1_manuscriptasseturl` = null)

Expected result:

- Diagnostic Execution Status = `835500005` (Deferred)
- Diagnostic Execution Error = `Manuscript asset not attached or not approved.`
- No AI called
- No Opportunity created
- No author email sent from Flow D

Actual result:

| Field | Value |
|---|---|
| `jm1_diagnosticexecutionstatus` | `835500005` (Deferred) |
| `jm1_diagnosticexecutionerror` | `Manuscript asset not attached or not approved.` |
| `jm1_diagnosticrequireshumanreview` | `true` |
| `jm1pub_jackiereviewrequired` | `true` |
| `jm1pub_diagnosticstatus` | `196650004` (Awaiting Jackie Review) |
| `jm1_diagnosticlastattempton` | 2026-06-15T12:51:18Z |
| `jm1_diagnosticattemptcount` | 1 |

Gate confirmed. No AI execution occurred. No Opportunity created. No author email sent from Flow D. No historical rows processed.

### Boundaries

- Flow A behavior: unchanged
- Flow B behavior: unchanged
- Flow C behavior: unchanged
- `/join`: unchanged
- AI execution: blocked until gate passes
- Opportunity creation: not performed
- Historical row processing: not performed

## Stage 0 AI Execution Status

- Flow D manuscript asset gate: live and verified (2026-06-15).
- AI execution: deferred. No AI call is made until the side-effect-free diagnostic AI execution contract is approved and all open decisions are resolved.
- No Opportunity is created at any stage of the current INT-PUB-005 pipeline.
- No author email is sent by Flow D.
- No historical rows are processed.

The next contract is documented at:
`docs/operations/int-pub-005-stage0-diagnostic-ai-execution-contract.md`

## Diagnostic AI Runner — Contract-Test Confirmation

**Date:** 2026-06-15

**Mode:** Contract-test (no AI execution)

**Function:** `jm1-diagnostic-ai-runner` — `azure-functions/diagnostic-ai-runner/`

**Route:** `POST /api/run-stage0-diagnostic`

The Azure Function scaffold was created and validated in contract-test mode.

### Validation checks passed

| Check | Result |
|---|---|
| `node --check src/functions/runStage0Diagnostic.js` | Pass |
| `node --check src/dataverse/client.js` | Pass |
| `node --test test/validation.test.js` | Pass — 11 assertions |
| `next lint` | Pass |
| `next build` | Pass |
| `git diff --check` | Pass |

### Contract-test response confirmed

A valid request with correct `x-jm1-diagnostic-runner-key`, a valid UUID `diagnosticId`, a valid `intakeReferenceCode`, and an optional `correlationId` returns:

```json
{
  "status": "accepted",
  "mode": "contract-test",
  "diagnosticId": "<UUID>",
  "intakeReferenceCode": "<JMP-INT-...>",
  "correlationId": "<value or null>",
  "message": "Diagnostic runner contract accepted. AI execution not enabled."
}
```

HTTP status: `202 Accepted`

### Boundaries

- AI execution: not performed. `CONTRACT_TEST_MODE = true`.
- Dataverse: not read or written.
- SharePoint / manuscript file: not accessed.
- Opportunity: not created.
- Author email: not sent.
- Historical rows: not processed.
- Secrets, tokens, manuscript content: not committed.

### Next step

Flow D integration and AI execution are not authorized in this pass. The full function specification and open decisions are documented in:

- `docs/operations/int-pub-005-stage0-diagnostic-ai-runner-azure-function.md`
- `docs/operations/int-pub-005-stage0-diagnostic-ai-execution-contract.md`

## Diagnostic AI Runner — Live Deployment Contract Test

**Date:** 2026-06-16

**Function App:** `func-jm1-diagnostic-ai-runner`

**Route:** `https://func-jm1-diagnostic-ai-runner.azurewebsites.net/api/run-stage0-diagnostic`

**Resource group:** `rg-jm1-ai`

**Runtime:** Node.js 22

### HTTP 202 — Valid request

Request: `POST /api/run-stage0-diagnostic` with valid `x-jm1-diagnostic-runner-key`, valid `diagnosticId` (all-zeros UUID), valid `intakeReferenceCode`, valid `correlationId`.

Response:

```json
{
  "status": "accepted",
  "mode": "contract-test",
  "diagnosticId": "00000000-0000-0000-0000-000000000000",
  "intakeReferenceCode": "JMP-INT-000000-CONTRACT-TEST",
  "correlationId": "INT-PUB-005-RUNNER-CONTRACT-TEST-001",
  "message": "Diagnostic runner contract accepted. AI execution not enabled."
}
```

HTTP status: `202 Accepted`

### HTTP 401 — Missing runner key

Request: `POST /api/run-stage0-diagnostic` with no `x-jm1-diagnostic-runner-key` header.

Response:

```json
{
  "status": "error",
  "code": "UNAUTHORIZED"
}
```

HTTP status: `401 Unauthorized`

### Boundaries confirmed — live deployment

- AI execution: not performed. `CONTRACT_TEST_MODE=true` set in app settings.
- Dataverse: not read or written.
- SharePoint / manuscript file: not accessed.
- Opportunity: not created.
- Author email: not sent.
- Historical rows: not processed.
- Flow D: not connected to this runner.
- Secrets, tokens, manuscript content: not committed or logged.
- Runner key: stored in `jm1-core-vault` as `jm1-int-pub-005-diagnostic-runner-key`; referenced via Key Vault reference in app settings; never exposed in logs or repo.
