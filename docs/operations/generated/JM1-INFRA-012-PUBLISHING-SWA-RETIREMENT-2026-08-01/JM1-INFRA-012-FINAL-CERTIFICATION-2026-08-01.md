# JM1-INFRA-012 Final Certification

Generated: 2026-08-01

## Certification Decision

PUBLISHING SWA RETIRED

## Required Findings

| Question | Result |
| --- | --- |
| Did SWA serve production at start? | No. DNS and App Service binding proved production traffic served by App Service. |
| Did App Service fully replace SWA? | Yes. Production and staging health passed after SWA deletion. |
| Which GitHub checks were removed? | `Azure Static Web Apps CI/CD / Build and Deploy Job` was removed as an active workflow/check by disabling the workflow and deleting the workflow file. |
| Which replacement checks are authoritative? | `Publishing App Service CI/CD`: build immutable artifact, guard scripts, checksum, staging deployment, staging health, and governed production promotion. |
| Which secrets were revoked? | `AZURE_STATIC_WEB_APPS_API_TOKEN` and `AZURE_STATIC_WEB_APPS_API_TOKEN_CALM_PLANT_0F4F58410`. |
| Which previews were deleted? | SWA previews `341`, `349`, and `355`. |
| Was the SWA resource deleted? | Yes. `az staticwebapp list` returned no `jmerrill-pub` resource after deletion. |
| Rollback authority | App Service slot swap-back plus last-known-good immutable artifact. |
| Remaining exceptions | No blocking SWA exception. Azure Functions Node 22 remains separate. Contained app-settings output event requires security-administration disposition if Jackie wants credential rotation. |

## Production Validation

Production remained healthy after SWA deletion:

- `jmerrill.pub`: 200
- `www.jmerrill.pub`: 200
- `/join`: 200
- `/api/health`: 200 ready
- App Service production health: 200 ready
- App Service staging health: 200 ready
- author and publisher protected routes: unauthenticated 401
- activation and Stripe start routes: unauthenticated 401
- payment gate: disabled

## Boundary Confirmation

No author communication, package release, title advancement, Stripe onboarding, charge, transfer, payout, Business Central posting, DNS outage, App Service runtime regression, or SWA restoration occurred.

