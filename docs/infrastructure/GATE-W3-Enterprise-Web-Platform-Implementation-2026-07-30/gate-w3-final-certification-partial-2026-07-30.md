# GATE-W3 Final Certification Partial

Date: 2026-07-30
Gate: GATE-W3 Enterprise Web Platform Implementation
Mode: Controlled production default-hostname deployment of governed minimal runtime

## Controlling Outcome

PARTIAL - Financial production App Service target remains blocked.

The five-slot staging certification remained complete before production rollout. Production rollout was then started one app at a time using the governed minimal runtime artifact:

- Artifact: `/tmp/gate-w3-minimal-runtime-20260730.zip`
- SHA-256: `913fd27cdac46baadffe636527dc5582ed23125f91468d056127887fd5293652`
- Release: `GATE-W3-MINIMAL-RUNTIME-20260730-001`

## Production Rollout Result

| Sequence | App | Property | Result | Deployment ID | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `app-jm1-one-prod` | `jmerrill.one` | PASS | `51d74c42-cfae-4f94-8d95-dc495b419598` | `/api/health` returned 200 with release `GATE-W3-MINIMAL-RUNTIME-20260730-001`, `traffic_migrated=false`. |
| 2 | `app-jm1-fin-prod` | `jmerrill.financial` | BLOCKED | Not confirmed | OneDeploy submission timed out. Deployment-history read timed out. Runtime probes timed out and intermittently returned 503 after the bounded restart/redeploy attempt. |
| 3 | `app-jm1-foundation-prod` | `jmerrill.foundation` | NOT ATTEMPTED | N/A | Fan-out stopped at Financial target. |
| 4 | `app-jm1-productions-prod` | `jmerrill.productions` | NOT ATTEMPTED | N/A | Fan-out stopped at Financial target. |
| 5 | `app-jm1-jackiesmithjr-prod` | `jackiesmithjr.com` | NOT ATTEMPTED | N/A | Fan-out stopped at Financial target. |

## Financial Target Failure

Affected target: `app-jm1-fin-prod`

Observed state after the controlled attempt:

- App Service state: `Running`
- Availability state: `Normal`
- Runtime stack: `NODE|22-lts`
- Startup command: `node server.js`
- Always On: enabled
- HTTP/2: enabled
- SCM type: `None`
- FTP Basic: disabled
- Health check path: `/`

Failure evidence:

- `az webapp deploy` using OneDeploy with the governed artifact timed out while targeting `app-jm1-fin-prod`.
- A second bounded attempt after a restart, with Kudu warmup and deployment-status tracking disabled, also hung before returning a deployment result.
- Deployment-history reads for `app-jm1-fin-prod` timed out.
- `/` and `/api/health` on `https://app-jm1-fin-prod.azurewebsites.net` timed out repeatedly, with an intermittent 503 observed after restart.
- The rollout was stopped before any later production apps were modified.

## Current Classification

GATE-W3 Status: PARTIAL

Exact failure class:

`app-jm1-fin-prod` production slot App Service publishing/runtime path is not certifiable. The failure is target-specific at the Financial App Service production slot and affects OneDeploy completion evidence, deployment-history readback, and live runtime health.

Azure component currently implicated:

`Microsoft.Web/sites/app-jm1-fin-prod` production slot, specifically the OneDeploy/SCM deployment path and runtime startup/health path after Node 22 configuration.

Root cause:

Unresolved. Evidence is consistent with an App Service target-specific deployment/runtime hang rather than a repository artifact defect, because the same governed artifact successfully certified `app-jm1-one-prod` and all five staging slots.

## Safe Next Action

Do not continue production fan-out until `app-jm1-fin-prod` is repaired or explicitly exempted by governance.

Recommended next diagnostic package:

1. Inspect `app-jm1-fin-prod` SCM/Kudu health directly.
2. Inspect deployment locks, `/home/data/SitePackages`, `/home/site/deployments`, and startup logs.
3. Compare Financial production against the healthy `app-jm1-one-prod` production target and healthy Financial staging slot.
4. Determine whether a supported cleanup, restart, or production-slot rollback is required.
5. If the target cannot be repaired without destructive production action, prepare a Microsoft support case for the Financial production App Service slot.

## Boundaries Confirmed

- `app-jm1-pub-prod` was not modified.
- No DNS cutover occurred.
- No customer traffic migration occurred.
- No Static Web Apps retirement occurred.
- No real website code was deployed.
- SCM Basic and FTP Basic were not enabled.
- No App Service Plan resize occurred.
- No secrets were printed or preserved in this evidence note.


## Additional Financial Repair Evidence

A controlled Financial-only slot-swap repair was attempted after the initial OneDeploy and static-deploy attempts failed to produce a certifiable production runtime.

Findings:

- Financial staging was healthy before the swap.
- The `az webapp deployment slot swap` command timed out locally, but subsequent probes proved the swap completed server-side because production began serving the minimal runtime with staging environment values.
- Production and staging app settings were reset to their intended identities.
- Financial staging accepted a governed ZIP redeployment with deployment ID `3bdef962-0a4e-43fb-9378-92e89bddd0bc` and recovered to 200 responses.
- Financial production briefly returned 200 responses, then became unstable and returned repeated request timeouts.
- Current Financial production configuration readback shows `NODE|22-lts`, startup `node server.js`, `JM1_SLOT_ENVIRONMENT=production`, `NODE_ENV=production`, `WEBSITE_RUN_FROM_PACKAGE=1`, SCM type `None`, and FTP Basic disabled.
- Current Financial production runtime remains non-certifiable because `/api/health` times out.

Updated blocker classification:

`app-jm1-fin-prod` production slot has a target-specific App Service runtime/deployment instability. The governed artifact is proven on `app-jm1-one-prod` production and Financial staging, but Financial production cannot sustain the same runtime after supported deploy/swap repair.

Safe next action:

Open a Financial production App Service incident/support diagnostic before continuing production fan-out. If Jackie authorizes destructive repair later, the likely bounded path is production-slot recreation or production app recreation from exported configuration, but that is not authorized under the current non-destructive boundary.
