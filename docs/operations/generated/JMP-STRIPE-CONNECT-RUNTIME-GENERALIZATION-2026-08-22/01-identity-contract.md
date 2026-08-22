# Identity Contract

Last verified: 2026-08-22T08:30:28Z

## Required Resolution

Stripe Connect enrollment is now resolved from governed author identity rather than title-specific context.

The runtime requires:

- `contactId`
- `authorRelationshipId`
- `royaltyPayeeId`
- `authorName`
- `payeeName`
- `authorEmail`
- `existingStripeAccountId`, when present
- `migrationBatch`

## Current Canonical Data Source

The author portal access code supplies the Contact context. The runtime reads the active Contact and exactly one active Author Profile from Dataverse.

Current implementation note: because a separate dedicated royalty-payee table is not present in current main, the active Author Profile is used as the governed royalty-payee surface for this enrollment runtime. This preserves one author/payee payout relationship across many titles and avoids title-level Stripe accounts.

## Fail-Closed Conditions

The runtime fails closed when:

- Contact is missing.
- Contact is inactive or cannot be found.
- Author Profile is missing.
- More than one active Author Profile matches the Contact.
- Requested Author Relationship does not match the resolved profile.
- Requested Royalty Payee does not match the resolved profile.
- Requested author email conflicts with the Contact email.
- Payee name is missing.
- Existing Stripe account metadata conflicts with Contact, Author Relationship, Royalty Payee, or email.

## Browser Input Boundary

The author browser no longer sends or selects a Stripe account ID. Browser-submitted `stripeAccountId` values are ignored by removal, not trusted.

