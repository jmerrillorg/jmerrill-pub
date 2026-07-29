# Reference Certification Decision

Decision: NOT_CERTIFIED

## Rationale

jmerrill.pub is operating on App Service in production, with DNS, TLS, health checks, Key Vault-backed configuration, managed identity, diagnostics, and basic monitoring materially in place. The production site and primary public routes respond normally from the App Service target.

The implementation is not yet a certified enterprise reference because two blocking business-path controls remain incomplete:

1. Final positive `/join` evidence has not yet been replayed on a workflow-deployed authoritative staging release.
2. Fresh own-artifact download proof was not repeated with a delivered synthetic author-facing artifact.

## Current Status

- Production App Service: operating
- Publishing DNS cutover: completed
- Static Web Apps retirement: not performed
- Business-path certification: incomplete
- Positive `/join`: completed in staging with token-bearing synthetic intake `JMP-INT-202607-YEUSKK`
- Staging auto-swap: disabled after remediation
- Staging Author Operating Center gate/session: master-code issuance, cookie, context, logout, and post-logout denial passed; fresh synthetic fixture grant is absent
- App Service workflow: current-head staging deploy, rollback-to-prior, and roll-forward all passed with production promotion disabled
- Staging health: workflow-deployed release `172779c04df6d7e7adf6ee1fad96664cbbf2ac61` passed 10/10 health certification
- Enterprise reference status: not certified

## Next Gate Recommendation

Do not advance to GATE-W2 until GATE-W1 reaches CERTIFIED_REFERENCE or Jackie formally accepts a revised standard with documented compensating controls.

Recommended next action:

Resolve GATE-W1-EX-007 and GATE-W1-EX-008 in a focused completion pass, then rerun the evidence package and decision. GATE-W2 remains unauthorized.
