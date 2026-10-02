# Authentication And Session Proof

Last verified: 2026-09-02T21:45:33Z

## Local Regression

Command: `npm run author-auth-guard`

Result: `PASS`

Coverage:

- Legacy Azure AD B2C provider import removed.
- CIAM scopes and OIDC security checks configured.
- Stable Microsoft author provider ID exists.
- Email OTP provider exists for routine author login.
- Publisher provider cannot shadow author role classification.
- OTP challenge is hashed, scoped, and replay-resistant.
- Invalid, expired, and max-attempt OTP states fail closed.
- Production session secret must be configured and strong.
- Former static session fallback is rejected.
- Secret rotation invalidates old sessions.

## Production Runtime Probe

- `GET https://jmerrill.pub/api/health`: `200`
- `GET https://jmerrill.pub/api/author/context` without session: `401 author_session_missing`
- `POST https://jmerrill.pub/api/author/logout` without session: `200`, clears `jm1_author_portal_session`
- `POST https://jmerrill.pub/api/author/gate` with invalid code: `401 Invalid access code`

## Assessment

Authentication/session controls are proven for fail-closed unauthenticated runtime behavior and source-backed local security tests. Live authenticated browser continuity was not exercised in this pass.
