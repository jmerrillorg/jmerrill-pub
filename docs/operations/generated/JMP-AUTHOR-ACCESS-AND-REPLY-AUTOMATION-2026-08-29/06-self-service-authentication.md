# Self-Service Authentication

Last Verified: 2026-08-29T07:12:31Z

## Implemented Surface

- Public Author Hub now labels the secure workspace entry as `Author Sign In`.
- Public Author Hub now includes `Account Access` with `Need help?`.
- Author gate now directs blocked authors to contact `publishing@jmerrill.one` from the email connected to their author record.

## Security Boundary

- No universal access code is presented.
- No password reset is handled by Jackie.
- No JM1 workforce account is created for ordinary author access.
- The self-service path remains author-owned sign-in plus governed one-time activation/recovery where needed.

## Remaining Commissioning Need

Full self-service commissioning still requires deployed recovery-request intake, enumeration-safe response behavior, and production readback of deterministic recovery handling.
