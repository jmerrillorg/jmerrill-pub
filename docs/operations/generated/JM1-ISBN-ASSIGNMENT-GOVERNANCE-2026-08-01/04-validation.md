# Validation

## Commands

Validation command:

`node scripts/isbn_assignment_governance.test.mjs`

Expected coverage:

- author-review proofs do not require ISBN assignment;
- Production Metadata Gate becomes ready only with complete product metadata;
- approval locks ISBN to title, edition, format, and imprint;
- duplicate or reused ISBN assignments fail closed;
- new editions cannot reuse prior edition ISBNs;
- test, synthetic, duplicate, and abandoned products cannot consume ISBNs;
- distributed formats require separate ISBNs.

## Production Mutation

Production ISBN assignments: 0

Bowker registrations: 0

Distributor metadata submissions: 0

Barcode generations: 0

The implementation establishes governance and guards only.
