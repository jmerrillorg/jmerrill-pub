# Current Auth Architecture

Last Verified: 2026-08-29T07:12:31Z

## Current Route

AUTHOR
  -> Microsoft External ID / author-owned sign-in
  -> Dataverse Contact identity binding
  -> Author/title entitlement resolution
  -> Author Operating Center

## Evidence Sources

- `lib/server/author-durable-auth.ts`
- `lib/server/author-portal-access.ts`
- `lib/server/author-portal-context.ts`
- `scripts/author_activation_recovery_governance.test.mjs`

## Current Behavior

- Production master/universal author access code is blocked.
- One-time activation/recovery codes are business identity-verification bridges, not durable passwords.
- Durable routine access resolves by `externaluseridentifier` before email-compatible fallback.
- Stripe Connect/direct-deposit setup uses Stripe-hosted account links and signed enrollment context, not Author Operating Center activation codes.
