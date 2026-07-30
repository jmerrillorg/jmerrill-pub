# JackieSmithJr Staging Runtime Blocker

Verified: 2026-07-30

Scope: `app-jm1-jackiesmithjr-prod/staging` only.

## Current state

- Slot state: Running
- Runtime: `NODE|22-lts`
- Startup command: `node server.js`
- SCM Basic: disabled
- FTP Basic: disabled
- Governed artifact deployed: `/tmp/gate-w3-minimal-runtime-20260730.zip`
- Governed artifact SHA-256: `913fd27cdac46baadffe636527dc5582ed23125f91468d056127887fd5293652`
- Latest successful OneDeploy ID observed: `c4b65402-1d36-457d-ad71-1fd30491d03c`

## Symptoms

After successful OneDeploy and restart, both public slot endpoints remained unavailable:

- `/`: timeout or `503`
- `/api/health`: timeout or `503`

Fresh startup logs show repeated App Service warmup failure. The container launches under the Node 22 blessed image but does not satisfy the HTTP startup probe. Earlier logs also show repeated `Cannot find module '/home/site/wwwroot/server.js'` and later warmup failures after deployment history was created.

## Comparison

Healthy staging peers include:

- `app-jm1-one-prod/staging`
- `app-jm1-fin-prod/staging`
- `app-jm1-foundation-prod/staging`
- `app-jm1-productions-prod/staging`

The failing slot differs from `app-jm1-foundation-prod/staging` only in property/domain identifiers and telemetry keys. No app setting drift explaining the failure was found.

## Repair attempts

Performed:

1. Verified slot runtime and startup configuration.
2. Re-deployed the governed minimal runtime artifact once.
3. Restarted the staging slot.
4. Tested an explicit `PORT=8080` / `WEBSITES_PORT=8080` pin as a non-destructive configuration repair.
5. Removed the temporary port settings after they did not recover the slot.

Not performed:

- No production app changes.
- No DNS changes.
- No traffic migration.
- No real website deployment.
- No Static Web Apps retirement.
- No slot deletion/recreation.

## Classification

`GATE-W3` remains blocked on `app-jm1-jackiesmithjr-prod/staging`.

The next likely remediation is staging-slot recreation or Microsoft platform support. The current enterprise directive explicitly authorized staging-slot recreation for `app-jm1-productions-prod/staging`, but not for `app-jm1-jackiesmithjr-prod/staging`. Because slot recreation is destructive, Cody did not perform it under the current authorization.

## Required next action

Jackie decision required:

Authorize one of:

1. Recreate only `app-jm1-jackiesmithjr-prod/staging`, preserving production app, approved settings, managed identity, monitoring, Node 22 runtime, deployment isolation, and governed artifact deployment; or
2. Open a Microsoft support case for target-specific App Service staging-slot startup failure.

