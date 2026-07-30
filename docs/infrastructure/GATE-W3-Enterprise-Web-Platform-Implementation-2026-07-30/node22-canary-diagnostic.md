# GATE-W3 Node 22 Canary Diagnostic

Program: JM1-INFRA-006  
Gate: GATE-W3  
Canary target: `app-jm1-one-prod/staging`  
Authority: Jackie Node 22 canary diagnostic authorization  
Result: COMPLETE - NODE 20 RUNTIME CONTRIBUTION CONFIRMED

## Purpose

This diagnostic tested whether the deprecated Node.js 20 Linux App Service runtime materially contributed to the Kudu/OneDeploy pre-warm failure and ZIP deployment timeout observed during GATE-W3.

## Before State

- App: `app-jm1-one-prod`
- Slot: `staging`
- Runtime: `NODE|20-lts`
- Startup command: `node server.js`
- SCM Basic: `false`
- FTP Basic: `false`
- Root probe: `error` / `TimeoutError`
- Health probe: `error` / `TimeoutError`
- App setting values recorded: no

## Runtime Change

Azure supported runtime list exposed Node 22 LTS as `NODE|22-lts`. Only the canary staging slot was changed from `NODE|20-lts` to `NODE|22-lts`.

Preserved controls:

- Startup command remained `node server.js`.
- SCM Basic remained disabled.
- FTP Basic remained disabled.
- Production slot was not changed.
- No other app or slot was changed.
- No traffic migration, DNS, domain, or Static Web Apps change occurred.

Restart timestamp: `2026-07-30T11:41:02Z`.

## Artifact

- Artifact: `/tmp/gate-w3-minimal-runtime-20260730.zip`
- SHA-256: `913fd27cdac46baadffe636527dc5582ed23125f91468d056127887fd5293652`
- Expected SHA-256 matched: `True`
- Artifact was not rebuilt, modified, or substituted.

## Deployment Result

The existing GitHub workflow was not dispatched because its GATE-W3 minimal-runtime job currently fans out to all ten targets, while this directive authorized only the canary slot. The canary used the same App Service ZIP/OneDeploy deployment channel without publishing credentials.

- Method: `az webapp deploy (App Service ZIP/OneDeploy path); existing GitHub workflow not dispatched because it targets all ten GATE-W3 apps/slots and this directive authorizes only the canary slot`
- Result: `DEPLOY_COMMAND_SUCCEEDED`
- Exit code: `0`
- Duration seconds: `159.956`
- Deployment ID: `e778a85f-543b-4652-be09-8934bdd15ee9`
- Deployment history count: `1`

Observed change from Node 20 failure:

- Kudu warmed successfully.
- OneDeploy completed successfully.
- Deployment history row was created.

## Runtime Validation

After post-deploy restart and warmup:

- `/api/health`: recovered to HTTP 200.
- `/`: HTTP 200.
- Ten consecutive `/api/health` probes: `10/10` PASS.
- Contract fields validated: `status=ready`, `property=jmerrill.one`, `traffic_migrated=false`.
- Release reported: `GATE-W3-MINIMAL-RUNTIME-20260730-001`

## Decision

NODE 20 RUNTIME CONTRIBUTION: CONFIRMED.

Node 22 did not merely change the startup behavior; it restored Kudu warm-up, successful OneDeploy completion, deployment-history creation, and the expected health contract on the canary staging slot.

## Current State Left In Azure

- `app-jm1-one-prod/staging` remains on `NODE|22-lts` for supportability and evidence continuity.
- SCM Basic remains disabled.
- FTP Basic remains disabled.
- The other nine GATE-W3 targets were not changed.

## Required Next Action

Return for Jackie approval before standardizing Node 22 across the remaining GATE-W3 apps and slots. GATE-W3 is not complete from this one canary.

Recommended next step: approve a bounded Node 22 standardization wave for the remaining nine targets, followed by the full 5 production app / 5 staging slot minimal-runtime deployment and runtime certification matrix.

## Unauthorized Actions Confirmation

The following did not occur:

- Production slot runtime change
- Any other app or slot runtime change
- SCM Basic enablement
- FTP Basic enablement
- Production DNS cutover
- Customer-domain attachment
- Static Web Apps retirement
- Real website deployment
- Publishing app modification
- App Service Plan resize
- Azure Policy change
- Container architecture change
- Secret exposure
- Evidence deletion
