# Failure-Mode Commissioning

Status: local guard coverage only; production failure-mode tests pending.

Implemented guard coverage:

- Canonical origins cannot be erased by `INTAKE_ALLOWED_ORIGINS`.
- Manuscript now/later is preserved.
- Service consent is separate from marketing consent.
- Email binding requires Publisher session and explicit message/attachment identifiers.
- Continuation tokens are signed and intake-bound.

Required production tests:

- Notification failure with durable intake visible in Publisher queue.
- Dataverse failure without false success response.
- Routing/Classification failure after durable intake.
- Invalid origin rejection without PII persistence.
- Duplicate retry without duplicate intake/contact/lead/project.

