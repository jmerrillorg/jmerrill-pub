# Rollover and Rollback Validation

## Rollover Performed

Publishing-only DNS cutover was performed:

- Apex A moved to App Service IP 40.122.114.229.
- www CNAME moved to app-jm1-pub-prod.azurewebsites.net.
- App Service managed certificates were created and bound.
- Canonical health checks passed against App Service.

## Rollback Assets

Pre-cutover DNS values captured:

- Apex A: 172.170.119.25
- www CNAME: calm-plant-0f4f58410.6.azurestaticapps.net
- TTL: 3600

The prior Static Web Apps deployment was not retired during this gate.

## Rollback Procedure

If Publishing App Service must be backed out before final reference certification:

1. Restore the apex A record to 172.170.119.25.
2. Restore www CNAME to calm-plant-0f4f58410.6.azurestaticapps.net.
3. Allow DNS TTL propagation.
4. Validate /api/health, /, /join, /books, /authors, /robots.txt, and /sitemap.xml.
5. Leave App Service resources intact for remediation unless Jackie authorizes teardown.

## Slot Strategy

- Staging slot exists.
- Auto-swap was found enabled for staging with `autoSwapSlotName: production` during the 2026-07-29 review.
- Auto-swap was disabled on staging during GATE-W1 remediation.
- Post-remediation readback confirmed `autoSwapSlotName: null`.
- Production package deployment was completed directly.

## Staging Immutable-Artifact Rollback Proof

Because production promotion of PR #349 was not authorized, rollback was proven in staging using immutable workflow artifacts rather than a production slot swap.

- Current-head staging deploy: GitHub Actions run 30465444152, `172779c04df6d7e7adf6ee1fad96664cbbf2ac61`, health gate passed 10/10.
- Rollback staging deploy: GitHub Actions run 30466281742, `bd5ada518a4b2307b49c01f8ef678f51ef6f5cee`, health gate passed 10/10.
- Roll-forward staging deploy: GitHub Actions run 30466962103, `172779c04df6d7e7adf6ee1fad96664cbbf2ac61`, health gate passed 10/10.

The temporary rollback-proof branch was deleted after the roll-forward run. Staging now reports `172779c04df6d7e7adf6ee1fad96664cbbf2ac61`, `status=ready`, payment gate disabled, and `autoSwapSlotName: null`.

## Exception

Production slot-swap/swap-back remains unperformed by design. The certified reference pattern should require explicit production approval before applying the same artifact promotion procedure to public traffic.

## Current Staging Stability Note

The workflow-deployed staging release `cb32158e4c52750b41d2eda4351af0f8f356fb00` passed the final GATE-W1 restart/cold-start health proof on 2026-07-29:

- Explicit staging restart performed.
- 10 consecutive `/api/health` probes completed.
- All 10 returned HTTP 200 and `status=ready`.
- All 10 reported release `cb32158e4c52750b41d2eda4351af0f8f356fb00`.
- All 10 reported `paymentGate=disabled`.
- No timeout, 500, 502, or restart loop was observed.

Production slot swap was not performed under GATE-W1. The certified rollback pattern remains immutable artifact rollback/roll-forward in staging plus documented DNS fallback to the preserved Static Web Apps target if Jackie separately authorizes production backout.
