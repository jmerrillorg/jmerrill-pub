# Execution Logging

Last verified: 2026-08-11T11:18:00Z

Each captured response creates an `AUTHOR_RESPONSE_CAPTURED` event containing:

- author;
- title;
- package / decision request;
- message ID;
- received timestamp;
- decision classification;
- notes reference;
- awaiting-state result;
- manual-recovery flag;
- idempotency key.

Duplicate execution events are blocked by the existing idempotency lookup.

