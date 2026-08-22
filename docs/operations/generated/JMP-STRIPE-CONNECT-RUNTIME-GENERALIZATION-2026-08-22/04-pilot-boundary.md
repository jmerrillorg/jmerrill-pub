# Pilot Boundary

Last verified: 2026-08-22T08:30:28Z

## Pilot State

The generalized runtime is ready for a controlled pilot after merge/deployment authority.

Pilot executed in this PR: NO

## Required Pilot Shape

The first pilot must use 3-5 normal clean payees from the 56 READY_FOR_STRIPE_CONNECT authors established by PR #563.

The 11 human-review exceptions are excluded.

## Pilot Must Prove

- Recipient author equals Author Relationship.
- Recipient author equals Royalty Payee.
- Royalty Payee equals Stripe Connect account owner.
- Onboarding link belongs to the verified Stripe account.
- Existing accounts are reused.
- New accounts are created only after exact search fails.
- Links are unique to the account.
- No cross-author linkage occurs.
- Canonical Publishing communication is used.
- Status sync works.
- Replay is idempotent.
- No payout occurs.

## Authorized Communication Template

Sender:

`J Merrill Publishing <publishing@email.jmerrill.one>`

Reply-To:

`publishing@jmerrill.one`

Subject:

`Set Up Your J Merrill Publishing Royalty Payments`

No pilot communication was sent by this PR.

