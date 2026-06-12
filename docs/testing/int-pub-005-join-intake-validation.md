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
