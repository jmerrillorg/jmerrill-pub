# Balance Authority

JM1 remains agreement and balance authority. Stripe confirms cash collection; QBO remains accounting authority.

The implemented state function starts from the frozen contractual total and applies unique confirmed payment effects less unique confirmed refunds. Processor fees never reduce the author obligation effect. Failed payments have zero balance effect.

The function does not use Stripe open invoices, QBO invoice balance, email, names, or free text as identity or balance authority.

Production materialization is blocked until a durable Dataverse payment ledger with uniqueness/concurrency enforcement is available.

