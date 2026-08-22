# Auto-Reconciliation Rules

Last Verified: 2026-08-22T01:08:44.371Z
Evidence Source: scripts/author_royalty_identity_reconciliation.mjs.

## Deterministic Signals

- Exact source email matched to one Dataverse contact with existing Stripe Connect account: MATCHED_EXISTING_STRIPE_CONNECT.
- Exact source email matched to one Dataverse contact and publishing relationship evidence exists: MATCHED_EXISTING_AUTHOR_RELATIONSHIP.
- Source email reused by multiple exact author vendors: DUPLICATE_EMAIL_REVIEW.
- Multiple Dataverse contacts sharing source email: DUPLICATE_EMAIL_REVIEW.
- Bill.com payee fields show entity/trust/estate/organization terms: PAYEE_ENTITY_REVIEW.
- Name-only match: NAME_VARIATION and human review, never automatic merge.
- Multiple candidate records: MULTIPLE_CANDIDATE_MATCHES.
- No exact email or unique normalized-name match: NO_CONFIDENT_MATCH.

## Prohibited Shortcuts

- No fuzzy-name-only mutation.
- No legal-name overwrite of publishing/public name.
- No public-name overwrite from Stripe identity.
- No author contact before JMP exhausts internal evidence.
