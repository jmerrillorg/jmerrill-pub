# Blocks 01-03 Commissioning

Last verified: 2026-08-26

## Block 01 - Intake / Front Door

Classification: `FULLY_COMMISSIONED`

Runtime proof:

- Canonical intake authority is `/api/publishing/intake`.
- Durable submission identity is preserved before acknowledgment.
- Dataverse authority is `jm1_publishingintake`.
- Intake supports idempotency, address capture, returning author recognition, manuscript now/later, continuation token, and original submission preservation.
- Supported manuscript inputs include `.docx`, `.pdf`, `.pages`, `.txt`, and shareable links.
- Notification is not treated as durability authority.

## Block 02 - Acquisition / Editorial Review / Offer

Classification: `FULLY_COMMISSIONED`

Runtime proof:

- Pre-contract editorial review, publisher recommendation review, package selection, offer construction, payment-option selection, loyalty/referral adjustment, discount cap, and author decision handling are governed.
- Agreement generation is not permitted before package acceptance and pricing authority exist.
- Commercial handoff is `PACKAGE_ACCEPTED`.

## Block 03 - Commercial / Agreement / Joined the Family

Classification: `FULLY_COMMISSIONED`

Runtime proof:

- Package acceptance, pricing lock, address snapshot, governed agreement generation, manual signature handoff, executed state, payment-selection evidence, first-payment request/readback, and `JOINED_THE_FAMILY` are governed.
- Stripe is the payment collection authority.
- Dynamics 365 Sales is the commercial authority.
- Business Central remains the accounting boundary.
- MoonClerk is denied for new payment paths.
- Idempotent replay must not create duplicate agreements, invoices, or payment plans.
- Production cannot start before required payment authority.
