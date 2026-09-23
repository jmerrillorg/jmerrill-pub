# Replay And Logout Tests

Last verified: 2026-09-02T21:45:33Z

## Local Replay Proof

- Valid OTP creates author identity once and rejects replay.
- Duplicate author reply creates one decision and remains idempotent.
- Retry after transient failure is idempotent.
- Duplicate mailbox ingestion remains idempotent.
- Forged cookies signed with the former fallback are rejected.
- Valid sessions are rejected after secret rotation.

## Production Logout Probe

`POST https://jmerrill.pub/api/author/logout` returned `200` and set `jm1_author_portal_session` with `Max-Age=0`, `HttpOnly`, `Secure`, and `SameSite=Lax`.

## Assessment

Replay controls are proven for OTP and author response paths. Logout cookie clearing is production-proven without requiring a live author session.
