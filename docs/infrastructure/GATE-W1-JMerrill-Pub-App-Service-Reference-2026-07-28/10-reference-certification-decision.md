# Reference Certification Decision

Decision: NOT_CERTIFIED

## Rationale

jmerrill.pub is operating on App Service in production, with DNS, TLS, health checks, Key Vault-backed configuration, managed identity, diagnostics, and basic monitoring materially in place. The production site and primary public routes respond normally from the App Service target.

The implementation is not yet a certified enterprise reference because five blocking controls remain incomplete:

1. Positive `/join` submission through production Turnstile was not proven; the staging hostname still produced Cloudflare Turnstile `110200`.
2. Slot-swap or equivalent rollback validation was not proven.
3. App Service GitHub Actions release pipeline was not implemented or proven.
4. Staging health is unstable after deployment/restart before later warm recovery.
5. Fresh own-artifact download proof was not repeated after the prior synthetic fixture was retired.

## Current Status

- Production App Service: operating
- Publishing DNS cutover: completed
- Static Web Apps retirement: not performed
- Business-path certification: incomplete
- Staging auto-swap: disabled after remediation
- Staging Author Operating Center gate/session: native issuance passed after explicit restart
- Staging health: unstable after restart, later recovered
- Enterprise reference status: not certified

## Next Gate Recommendation

Do not advance to GATE-W2 until GATE-W1 reaches CERTIFIED_REFERENCE or Jackie formally accepts a revised standard with documented compensating controls.

Recommended next action:

Resolve GATE-W1-EX-001, GATE-W1-EX-003, GATE-W1-EX-006, GATE-W1-EX-007, and GATE-W1-EX-008 in a focused completion pass, then rerun the evidence package and decision.
