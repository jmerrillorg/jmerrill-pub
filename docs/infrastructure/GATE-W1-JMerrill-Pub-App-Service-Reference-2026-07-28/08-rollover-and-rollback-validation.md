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

## Exception

A clean slot-swap rollback proof is not complete. An earlier swap attempt hung and was cancelled; staging later recovered after direct restart and a standalone redeployment. This prevents reference certification until rollback is tested or a governed alternative rollback proof is accepted.
