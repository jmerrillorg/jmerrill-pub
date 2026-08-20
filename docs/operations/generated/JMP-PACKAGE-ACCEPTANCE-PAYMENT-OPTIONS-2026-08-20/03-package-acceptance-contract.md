# Package Acceptance Contract

Last verified: 2026-08-20

## Event

Canonical event:

`PACKAGE_ACCEPTED`

Required captured fields:

- author/contact;
- title/project/intake;
- selected package;
- decision source/channel;
- decision timestamp;
- supporting communication/event;
- package recommendation context;
- idempotency key.

## Acceptance Semantics

| Case | Result |
| --- | --- |
| “Yes, I’d like to move forward with Professional.” | ACCEPTED / Professional |
| “I choose the Starter package.” | ACCEPTED / Starter |
| Sole Starter recommendation + “yes” | ACCEPTED / Starter |
| Two package options + “yes” | CLARIFICATION_REQUIRED |
| “Sounds good” / “I’m interested” | NO_ACCEPTANCE |
| Replay of same message | DUPLICATE |

## Starter Special Case

If Primary = Starter and no backup package exists, an unambiguous positive acceptance of the sole presented package resolves to Starter. The system does not manufacture a second package option.

## Idempotency

The package-acceptance idempotency key is stable across:

- diagnostic/title/project;
- inbound/supporting message;
- selected package.

Duplicate package acceptance remains blocked at one event.
