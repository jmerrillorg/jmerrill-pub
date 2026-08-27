# Human-First Copy

Last verified: 2026-08-27T10:30:00Z

Template source:

`renderStripeConnectReminderEmail()` in `scripts/stripe_connect_reminder_cadence.mjs`

Required shape:

- natural greeting;
- plain-language reason;
- direct setup button;
- no J Merrill Publishing activation code dead end;
- support path by reply;
- Publishing signature;
- HTML format;
- canonical Publishing sender route.

Sender authority:

| Field | Value |
| --- | --- |
| FROM | `publishing@email.jmerrill.one` |
| REPLY-TO | `publishing@jmerrill.one` |
| CC/archive | `publishing@jmerrill.one` |
| Type | SERVICE / OPERATIONAL |

The guard denies internal Stripe field names, runtime/artifact/system terms, royalty amount/timing/schedule language, and money-movement terminology.

