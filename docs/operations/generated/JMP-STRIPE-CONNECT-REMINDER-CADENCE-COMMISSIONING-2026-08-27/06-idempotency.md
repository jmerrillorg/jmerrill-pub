# Idempotency

Last verified: 2026-08-27T10:30:00Z

Rule:

`AUTHOR + CONNECT ACCOUNT + REMINDER STAGE = ONE VALID SEND`

Implemented protections:

- same-day duplicate guard;
- same-stage duplicate guard;
- final-reminder terminal guard;
- one-stage-only catch-up behavior when history is partial;
- same canonical Stripe account required for fresh Account Links.

Regression coverage:

- same reminder already sent;
- same-day duplicate attempt;
- final reminder already sent;
- expired Account Link needing a fresh link against the same account.

