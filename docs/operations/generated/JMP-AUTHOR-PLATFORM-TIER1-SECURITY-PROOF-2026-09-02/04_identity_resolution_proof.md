# Identity Resolution Proof

Last verified: 2026-09-02T21:45:33Z

## Evidence Sources

- `lib/server/author-durable-auth.ts`
- `lib/server/author-portal-context.ts`
- `scripts/author_external_id_claim_resolution.test.mjs`
- `scripts/author_email_otp_login.test.mjs`
- `scripts/author_activation_recovery_governance.test.mjs`

## Proven Behavior

- Durable author session evaluates immutable External ID object binding.
- Protected routes resolve External ID before email where the object ID is present.
- Contact login email resolver requires one Contact and exactly one active Author Profile.
- Alternate Contact emails can send OTP to the submitted login email while resolving the canonical Contact.
- Conflicting External ID sign-ins are rejected unless governed recovery is authorized.
- Publisher sessions are blocked from author workspace context.

## Runtime Gap

The current route can fall back to email-based author context resolution when a durable session lacks contact ID and External ID. That may be acceptable for OTP-backed routine author login, but the proof packet classifies it as a narrow identity-hardening item for future V1 activation review.
