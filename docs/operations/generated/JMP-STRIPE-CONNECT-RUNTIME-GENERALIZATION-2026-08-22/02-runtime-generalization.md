# Runtime Generalization

Last verified: 2026-08-22T08:30:28Z

## Route Updated

Route:

`app/api/author/stripe/connect/start/route.ts`

The route now:

- Requires valid author portal access.
- Rejects non-author/admin/generic contexts for payout enrollment.
- Resolves Contact, Author Relationship, and Royalty Payee before touching Stripe.
- Reuses a Dataverse-linked Stripe Connect account after identity verification.
- Searches Stripe by governed royalty-payee metadata before creating a new account.
- Creates a new account only when no exact identity match exists.
- Persists safe Connect linkage and readiness fields back to the Contact.
- Writes a safe execution-log event scoped to the Contact.

## Removed Competing Behavior

The route no longer:

- Accepts `body.stripeAccountId`.
- Uses The Intentional Leader as the enrollment context.
- Returns a commissioning reference.
- Creates title-level enrollment accounts.
- Initiates payments or royalties.

## Stripe Account Contract

New accounts are created as Stripe Standard Connect accounts with author/payee metadata only:

- `jm1_division=publishing`
- `jm1_contact_id`
- `jm1_author_relationship_id`
- `jm1_royalty_payee_id`
- `jm1_migration_batch`
- `jm1_source=Author Payout Enrollment`
- `jm1_payment_authorized=false`

Title metadata is blocked:

- `jm1_title`
- `jm1_reference`

Money-movement capability requests are blocked:

- `card_payments`
- `transfers`

## Idempotency

Account creation idempotency is keyed by Royalty Payee:

`jm1-author-payout-enrollment-account-<royaltyPayeeId>-v1`

Account links are generated against the same verified account and use unique idempotency keys so expired links can be reissued without replacing the payout relationship.

