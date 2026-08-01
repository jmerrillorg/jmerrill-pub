# JM1-INFRA-013 Enterprise App Service Completion

Date: 2026-08-01
Mode: governed inspection, certification, and retirement planning
Repository baseline: `origin/main` at `87fb1481ae7e95354e337f9d55caae625510f7c5`

## Decision

Classification: `APP SERVICE ENTERPRISE COMPLETE - DOCUMENTED EXCEPTIONS REMAIN`

This package establishes the authoritative enterprise hosting register for JM1 commercial web properties and confirms that `jmerrill.pub` is the only fully production-cut-over, business-certified App Service property as of this sweep.

Azure Static Web Apps cannot be fully retired from the JM1 commercial environment today because several active commercial domains still route to SWA-hosted production experiences, while their corresponding App Service targets are either minimal reference runtimes or blocked by a known platform/support exception.

## Certified Complete

- `jmerrill.pub` production traffic runs on `app-jm1-pub-prod`.
- `jmerrill.pub` and `www.jmerrill.pub` resolve to the Publishing App Service path.
- The Publishing SWA resource is absent from the active SWA inventory.
- Publishing production App Service responds normally.
- Publishing GitHub deployment authority is App Service, not SWA.

## Documented Exceptions

- `jmerrill.one`, `jmerrill.financial`, and `jmerrill.foundation` remain live on SWA; their App Service endpoints are healthy minimal GATE-W3 runtimes with `traffic_migrated=false`, not certified replacements for the public sites.
- `jmerrill.productions` remains live on SWA and the production App Service endpoint returns 503; this is the existing GATE-W3 Microsoft/support exception.
- `jmerrill.org` and `book.jmerrill.financial` remain SWA-hosted redirector or support properties.
- `www.jmerrill.productions` has an active DNS/SWA reference but failed TLS hostname validation during this sweep.
- `agapeic.org`, `jackiesmithjr.com`, `marcusmcintosh.org`, and non-JM1 client properties are separate review lanes and were not migrated under this gate.

## Production Safety

No DNS records were changed. No SWA resources were deleted. No customer traffic was migrated. No production application was deployed. No secrets were printed, exported, or retained in this package.

