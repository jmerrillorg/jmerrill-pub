# Payment Attribution Evidence

Last Verified: 2026-08-24

## Finding

The Publishing mailbox payment notification for Indomitable rendered the author
as Atta Darko while the same message body carried the Indomitable title,
Quanisha/Indomitable intake reference, Opportunity, Stripe invoice, PaymentIntent,
charge, customer, package, and payment-option context.

Notification timestamp:
2026-08-24T13:55:59Z

PR #601 production timestamp:
2026-08-24T20:35:41Z

Message pre-fix:
YES

## Disposition

The message predates the production deployment that removed the stale Atta
fallback. It is preserved as historical defect evidence. No Quanisha payment,
Opportunity, invoice, or lifecycle state was changed during this check.

## Remaining Code Search

Active payment notification fallback paths containing hardcoded `Atta Darko`
were not found in production source. Remaining references are test fixtures and
the regression guard that blocks restoring `|| 'Atta Darko'`.

