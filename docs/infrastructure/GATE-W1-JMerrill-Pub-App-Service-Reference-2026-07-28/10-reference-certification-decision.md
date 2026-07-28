# Reference Certification Decision

Decision: NOT_CERTIFIED

## Rationale

jmerrill.pub is operating on App Service in production, with DNS, TLS, health checks, Key Vault-backed configuration, managed identity, diagnostics, and basic monitoring materially in place. The production site and primary public routes respond normally from the App Service target.

The implementation is not yet a certified enterprise reference because three blocking controls remain incomplete:

1. Positive /join submission through production Turnstile was not proven.
2. Native staging Author Operating Center synthetic session issuance was not proven.
3. Slot-swap or equivalent rollback validation was not proven.

## Current Status

- Production App Service: operating
- Publishing DNS cutover: completed
- Static Web Apps retirement: not performed
- Business-path certification: incomplete
- Enterprise reference status: not certified

## Next Gate Recommendation

Do not advance to GATE-W2 until GATE-W1 reaches CERTIFIED_REFERENCE or Jackie formally accepts a revised standard with documented compensating controls.

Recommended next action:

Resolve GATE-W1-EX-001, GATE-W1-EX-002, and GATE-W1-EX-003 in a focused completion pass, then rerun the evidence package and decision.
