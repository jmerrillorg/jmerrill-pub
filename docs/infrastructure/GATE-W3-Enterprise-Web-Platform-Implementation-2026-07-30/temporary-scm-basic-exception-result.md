# GATE-W3 Temporary SCM Basic Publishing Exception Result

Program: JM1-INFRA-006  
Gate: GATE-W3  
Authority: Jackie time-boxed SCM Basic exception  
Mode: Controlled implementation, minimal runtime only  
Result: PARTIAL - publishing channel not restored

## Exception Window

- Started: 2026-07-30T10:46:10.049660+00:00
- Maximum expiry: 2026-07-30T12:46:10.049660+00:00
- Closed/verified disabled: 2026-07-30T10:54:32.372868+00:00
- Authorized scope: ten approved App Service targets in `rg-jm1-web-prod-appsvc`
- Actual deployment target attempted: `app-jm1-one-prod/staging`
- Fan-out deployment: not attempted after canary failed

## Artifact

- Path: `/tmp/gate-w3-minimal-runtime-20260730.zip`
- SHA-256: `913fd27cdac46baadffe636527dc5582ed23125f91468d056127887fd5293652`
- Contents: `package.json`, `server.js`
- Secret marker scan: no external-system or credential markers detected in the artifact contents

## Publishing Policy State

Before exception:

- SCM Basic: disabled on all five App Service apps
- FTP Basic: disabled on all five App Service apps

During exception:

- SCM Basic: temporarily enabled on the five approved App Service apps only
- FTP Basic: kept disabled

After failure:

- SCM Basic: disabled on all five App Service apps
- FTP Basic: disabled on all five App Service apps
- Final readback evidence: `final-basic-publishing-readback.json`

## Canary Deployment Result

Command class: Azure App Service ZIP deploy using the governed minimal runtime artifact.  
Canary target: `app-jm1-one-prod/staging`.

Observed Azure result:

- Kudu pre-warm failed for the staging instance.
- Deployment proceeded without pre-warm.
- Azure returned `504.0 GatewayTimeout` from the deployment path.
- Azure CLI advised checking the latest SCM deployment endpoint.
- Deployment history readback returned no deployment rows for the failed canary.

This satisfies the stop condition: Azure still could not deploy after SCM Basic was temporarily enabled.

## Runtime State After Stop

Post-disable probes continued to fail on the App Service targets. This is expected because the minimal runtime artifact was not deployed. GATE-W3 runtime certification remains incomplete.

## Root Cause Classification

The time-boxed Basic exception eliminated disabled SCM Basic credentials as the sole cause. The remaining fault is a Kudu/SCM/App Service deployment-channel failure for the App Service environment, demonstrated by Kudu warm-up failure and `504.0 GatewayTimeout` after SCM Basic was temporarily enabled.

Recommended next action: open Microsoft support or perform Azure platform-level App Service/Kudu remediation under separate authorization. Do not repeat Basic enablement or additional ZIP/FTPS/REST deployment attempts without a new governed approval.

## Boundary Confirmation

No production traffic migration, DNS/domain change, Static Web Apps retirement, real website deployment, Publishing app modification, plan-size change, Azure Policy or access restriction change, external-system write, secret exposure, or credential retention occurred during this exception.
