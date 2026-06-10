# INT-PUB-005 Join Intake Validation Notes

This repo does not currently include Jest, Vitest, Playwright, or another test runner. Validation for the INT-PUB-005 intake foundation is covered by TypeScript-safe utility boundaries and manual/API checks until a test framework is approved.

## Utility Coverage

Implemented utility boundaries:

- `lib/publishing/intake/schema.ts`
- `lib/publishing/intake/sanitize.ts`
- `lib/publishing/intake/reference.ts`
- `lib/publishing/intake/rateLimit.ts`
- `lib/publishing/intake/idempotency.ts`
- `lib/publishing/intake/turnstile.ts`
- `lib/publishing/intake/dataverse.ts`
- `lib/publishing/intake/deadLetter.ts`

## Manual Validation Cases

Use `POST /api/publishing/intake` with JSON payloads matching the INT-PUB-005 body.

1. Valid new submission payload should return `201` with `status: "received"` and a `JMP-INT-YYYYMM-XXXXXX` reference in non-production when Dataverse mapping is pending.
2. Missing required fields should return `400` with `status: "invalid"` and field-level errors.
3. Invalid email should return `400`.
4. `wordCount` below `100` or above `500000` should return `400`.
5. `bookDescription` below `50` characters should return `400`.
6. `additionalNotes` above `1000` characters should return `400`.
7. Script or HTML input should return `400`; unsupported control characters should return `400`.
8. Generated references should match `JMP-INT-YYYYMM-XXXXXX`.
9. Replaying the same idempotency key within 24 hours after a received submission should return `409` with `status: "duplicate"`.
10. Turnstile failure should return `400` before rate limit, validation, idempotency, or adapter writes.
11. Dataverse failure should attempt dead-letter handling; if neither Dataverse nor dead-letter succeeds in production, the API should return `5xx`.
12. Missing `manuscriptUrl` should be accepted.

## Non-Production Turnstile Behavior

When `TURNSTILE_SECRET_KEY` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` are not configured outside production, the client uses `development-turnstile-token` and the server accepts that token for local validation.

## Dataverse Boundary

`lib/publishing/intake/dataverse.ts` intentionally does not guess Dataverse column names. The adapter is blocked until Chad provides the `jm1_publishingintake` mapping appendix per INT-PUB-005 §4.
