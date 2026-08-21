# Manuscript-Later Proof

Status: implemented locally; production test pending.

Implemented:

- `/join` can create a valid intake without manuscript.
- Missing manuscript no longer triggers Editorial Review orchestration.
- HMAC-signed continuation token is created only after Dataverse returns a durable record id.
- Continuation URL routes to `/join/continue/[token]`.
- `GET /api/publishing/intake/continue/[token]` returns safe status.
- `POST /api/publishing/intake/continue/[token]` uploads a manuscript to the same intake.
- Continuation upload preserves original source and patches the same Dataverse intake.

Security:

- Token is non-guessable, signed, intake-bound, reference-bound, and expiring.
- Raw Dataverse ids are not sufficient without a valid token signature.
- Token signing secret must exist; otherwise no continuation link is produced.

Still required:

- Production upload-later synthetic test.
- Rotation/revocation procedure using `INTAKE_CONTINUATION_TOKEN_SECRET`.

