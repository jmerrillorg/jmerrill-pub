# Secure Context

Last Verified: 2026-08-26T23:34:13Z

## Token Contract

The setup context is HMAC signed and enrollment-bound.

| Field | Purpose |
| --- | --- |
| purpose | `stripe_connect_direct_deposit_setup` |
| contactId | Contact identity |
| authorRelationshipId | Author relationship identity |
| royaltyPayeeId | Royalty payee identity |
| stripeAccountId | Canonical Stripe Connect account |
| issuedAt | Token issuance timestamp |
| expiresAt | Token expiry timestamp |

Production now has a purpose-specific `AUTHOR_CONNECT_ENROLLMENT_TOKEN_SECRET` Key Vault backed app setting. `AUTHOR_PORTAL_ACCESS_CODE_PEPPER` remains only a fallback.

## Security Controls

Invalid, tampered, expired, wrong-author, and account-mismatch contexts fail closed.

The token does not contain activation codes, bank details, tax values, Stripe secrets, Account Link URLs, or royalty amounts.
