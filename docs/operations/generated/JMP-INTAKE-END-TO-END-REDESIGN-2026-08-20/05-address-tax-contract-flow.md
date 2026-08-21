# Address, Tax, and Contract Flow

Address is captured at `/join` for future contract, tax, invoice, and fulfillment use.

Implemented:

- Mailing address required at intake.
- Billing address can be marked same as mailing or provided separately.
- Address capture timestamp is represented in the normalized intake model.

Required downstream:

- Confirm current address before billing/agreement.
- Preserve agreement address snapshot.
- Preserve billing address snapshot.
- Preserve tax determination address snapshot.
- Never rewrite historical agreement or invoice facts when an author changes address later.

