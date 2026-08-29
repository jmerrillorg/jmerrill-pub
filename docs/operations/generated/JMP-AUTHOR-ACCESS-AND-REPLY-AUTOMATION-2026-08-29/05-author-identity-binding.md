# Author Identity Binding

Last Verified: 2026-08-29T07:12:31Z

## Governing Pattern

- Contact remains the identity anchor for author-owned access.
- `externaluseridentifier` is the durable Microsoft External ID object binding when present.
- Email address matching is allowed only as a controlled resolution bridge.
- Conflicting external identity binding requires governed recovery authorization.

## Evidence Sources

- `lib/server/author-durable-auth.ts`
- `lib/server/author-activation-recovery.ts`
- `scripts/author_activation_recovery_governance.test.mjs`

## Live Case Readback

- Ashanti Contact has no `externaluseridentifier` value at readback.
- Sean Contact has no `externaluseridentifier` value at readback.
- No cross-author identity binding was performed.
