# GATE-W3 Current Toolchain Retry

Generated: 2026-08-02

## Scope

Target: `app-jm1-productions-prod`

Resource group: `rg-jm1-web-prod-appsvc`

Subscription: `9ee13245-2303-4010-8b6d-35f7cbcfdc0e`

Execution branch: `codex/gate-w3-current-toolchain-retry`

Base: current `origin/main` at `b448cd1dbd41b521b63d20cfbe1ab3272ce69582`

PR #358 disposition: historical evidence / administrative exception only. It was
not used as the execution branch.

## Tool And Identity Readback

Azure cloud: AzureCloud

Tenant: `352d075e-8e17-4169-9f8e-22e6946ce66d`

Subscription: `JM1 – Nonprofit Core (2025 Grant)`

Signed-in principal: `jm1-admin@jmerrill.one`

Principal type: user

Tool versions are preserved in `current-tools-and-identity.json`.

## Current Resource Inventory

Production app:

- Name: `app-jm1-productions-prod`
- Hostname: `app-jm1-productions-prod.azurewebsites.net`
- Custom domains bound to App Service: none
- State: Running
- Availability state after repair: Normal
- Runtime: `NODE|22-lts`
- Startup command: `node server.js`
- Health check path: `/`
- Always On: true
- HTTPS Only: true
- Minimum TLS: 1.2
- FTPS: Disabled
- Managed identity: SystemAssigned
- App Service Plan: `asp-jm1-web-prod-linux`
- Region: Central US

Staging slot:

- Name: `app-jm1-productions-prod/staging`
- Hostname: `app-jm1-productions-prod-staging.azurewebsites.net`
- State before repair: Running and healthy
- Runtime: `NODE|22-lts`
- Startup command: `node server.js`
- Health check path: `/`

App-setting-name readback:

- Production names: 19
- Staging names: 19
- Names only in production: 0
- Names only in staging: 0
- Slot-setting classification differences: 0

Secret values were not printed or retained.

## Healthy Peer Comparison

Healthy peers checked:

- `app-jm1-one-prod`
- `app-jm1-foundation-prod`
- `app-jm1-fin-prod`
- `app-jm1-pub-prod`

Material comparison:

| Control | Productions | Healthy peers | Finding |
| --- | --- | --- | --- |
| App state | Running | Running | Match |
| Region | Central US | Central US | Match |
| OS/runtime | Linux / `NODE|22-lts` | One/Foundation/Financial use `NODE|22-lts`; Publishing uses `NODE|24-lts` | Acceptable for current Productions minimal runtime |
| App Service Plan | `asp-jm1-web-prod-linux` | One/Foundation/Financial share same plan; Publishing uses its own plan | Match with commercial peer plan |
| Startup command | `node server.js` | Same for web-plan peers by current pattern | Match |
| Always On | true | true | Match |
| HTTPS Only | true | true | Match |
| Health path | `/` | `/` or app-specific health | Acceptable |
| Custom domain | none bound to App Service | varies by property | No DNS cutover performed |

## Pre-Repair Failure

Current failure reproduced: YES

Pre-repair probes:

| Endpoint | Result | Classification |
| --- | --- | --- |
| Production root | 503 | `PLATFORM_503_OR_APP_UNAVAILABLE` |
| Production `/api/health` | 503 | `PLATFORM_503_OR_APP_UNAVAILABLE` |
| Production static route | 503 | `PLATFORM_503_OR_APP_UNAVAILABLE` |
| Production API route | 503 | `PLATFORM_503_OR_APP_UNAVAILABLE` |
| Staging root | 200 | `RESPONDS` |
| Staging `/api/health` | 200 | `RESPONDS` |
| Healthy peers | 200 | `RESPONDS` |

Failure class:

`DEPLOYMENT_PACKAGE_DEFECT_OR_PRODUCTION_SLOT_CONTENT_DRIFT`

Rationale:

- Production and staging had matching nonsecret runtime/startup/health settings.
- Production and staging had matching app-setting names and slot-setting
  classifications.
- Staging already served the approved minimal Productions readiness response.
- Healthy peer apps on the same shared plan were healthy.
- Production public endpoint returned platform 503 across root, health, static,
  and API probes.

No DNS, TLS, plan-capacity, or global App Service outage was required to explain
the observed state.

## Remediation Performed

One bounded production repair was performed:

1. Swapped `app-jm1-productions-prod/staging` to production.
2. Attempted one nonsecret production label correction:
   `JM1_SLOT_ENVIRONMENT=production`.

Slot swap Activity Log:

- Operation: `Microsoft.Web/sites/slots/slotsswap/action`
- Correlation ID: `f668e224-ec6f-402c-8a41-13701d789ff8`
- Started: `2026-08-03T01:21:26.859211Z`
- Accepted: `2026-08-03T01:21:29.3123742Z`
- Succeeded: `2026-08-03T01:23:33.5908428Z`

Nonsecret setting Activity Log:

- Operation: `Microsoft.Web/sites/config/write`
- Correlation ID: `8553de95-5dd4-4395-b6c0-44b073dc4a00`
- Succeeded: `2026-08-03T01:25:24.3635983Z`

No DNS change, plan resize, resource recreation, custom-domain change, managed
identity replacement, secret rotation, SCM Basic enablement, FTP Basic
enablement, database mutation, or traffic migration outside the App Service
Azure hostname occurred.

## Post-Repair Validation

Production `/api/health`:

```json
{
  "status": "ready",
  "service": "JM1 Enterprise Web Platform",
  "message": "Infrastructure Ready. Production traffic has not migrated.",
  "property": "jmerrill.productions",
  "environment": "staging",
  "release": "GATE-W3-MINIMAL-RUNTIME-20260730-001",
  "traffic_migrated": false
}
```

Post-repair probes:

| Endpoint | Result | Classification |
| --- | --- | --- |
| Production root | 200 | `RESPONDS` |
| Production `/api/health` | 200 | `RESPONDS` |
| Production static route | 404 | `ROUTE_404_OR_CONTENT_ABSENCE` |
| Production API route | 404 | `ROUTE_404_OR_CONTENT_ABSENCE` |
| Staging root | timeout / no response | Broken content moved to staging by swap |
| Staging `/api/health` | 503 / timeout | Broken content moved to staging by swap |
| Healthy peers | 200 | `RESPONDS` |

The remaining `environment: "staging"` field is classified as
`READINESS_MESSAGE_VARIANCE`. The nonsecret setting correction did not alter the
response body, so the label appears to be package/content-level output rather
than an active production app-setting value. It does not reproduce the original
GATE-W3 503 failure.

## Support Decision

Microsoft support ticket: NOT REQUIRED

Reason:

- The current failure was reproduced.
- Healthy staging content restored production health.
- The app service now responds 200/ready on the production Azure hostname.
- The remaining issue is a JM1-controlled package/readiness-label variance and
  stale staging content after the swap, not a reproducible Azure-owned platform
  failure.

## Final Classification

GATE-W3:

`CLOSED — CURRENT TOOLCHAIN REMEDIATION`

Root cause:

`DEPLOYMENT_PACKAGE_DEFECT_OR_PRODUCTION_SLOT_CONTENT_DRIFT`

Production health:

`READY`

Staging:

`REFRESH REQUIRED BEFORE REUSE`

PR #358:

`SUPERSEDED BY CURRENT-TOOLCHAIN REMEDIATION EVIDENCE`

## Required Follow-Up

1. Refresh the staging slot with the approved minimal Productions readiness
   package before future use.
2. Correct the readiness response label so the production hostname reports
   `environment: "production"` in a future package/config update.
3. Append this current-toolchain retry evidence to the historical PR #358
   disposition and close the draft rather than merging its historical file set.
