# Reference Certification Decision

Decision: CERTIFIED_REFERENCE

## Rationale

jmerrill.pub is operating on App Service in production, with DNS, TLS, health checks, Key Vault-backed configuration, managed identity, diagnostics, monitoring, staging deployment, rollback pattern evidence, and business-path validation in place.

The final GATE-W1 completion pass closed the remaining certification blockers:

1. Current-release `/join` positive proof passed with Turnstile, 201 receipt, one synthetic intake, one Contact, one Lead routing record, manuscript preservation, Stage 0 diagnostic, package recommendation, acknowledgement, execution evidence, and duplicate retry 409.
2. Native staging Author Operating Center proof passed with gate/session/context, own artifact 200, cross/missing artifact 404, no-cookie 401, forged former-fallback 401, logout 200, and post-logout 401.
3. Staging restart/cold-start health passed 10/10 on release `cb32158e4c52750b41d2eda4351af0f8f356fb00`.
4. Monitoring coverage now includes health, deployment, restart, Turnstile, Author Gate, orchestration, and rollback/swap alerts.

## Current Status

- Production App Service: healthy
- Staging App Service: healthy
- Publishing DNS cutover: completed
- Static Web Apps retirement: not performed
- Business-path certification: complete
- Positive `/join`: pass, `JMP-INT-202607-3R2ETT`
- Author Operating Center artifact access: pass
- Staging auto-swap: disabled
- App Service workflow: PR #349 staging deployment passed; production promotion skipped
- Enterprise reference status: certified

## Next Gate Recommendation

Proceed only to the planning/approval gate:

GATE-W2 - Enterprise Web Platform Topology & Cost Approval

No other web property migration is authorized by GATE-W1.
