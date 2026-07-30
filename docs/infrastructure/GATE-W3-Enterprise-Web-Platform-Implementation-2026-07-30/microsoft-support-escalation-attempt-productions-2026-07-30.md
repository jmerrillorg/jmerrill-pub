# Microsoft Support Escalation Attempt - Productions

Date: 2026-07-30
Gate: GATE-W3 Enterprise Web Platform Implementation
Target: `app-jm1-productions-prod`
Execution owner: Cody

## Current Classification

PARTIALLY COMPLETE - SUPPORT PLAN / PORTAL SUBMISSION EXCEPTION

GATE-W3 remains blocked by a target-specific Azure App Service production runtime failure on `app-jm1-productions-prod`.

## Corrected Support Target

The active blocked resource is:

- Resource: `app-jm1-productions-prod`
- Resource group: `rg-jm1-web-prod-appsvc`
- App Service plan: `asp-jm1-web-prod-linux`
- Region / SKU: Central US / Linux S1

Healthy production peers:

- `app-jm1-one-prod`
- `app-jm1-fin-prod`
- `app-jm1-foundation-prod`

Held production target:

- `app-jm1-jackiesmithjr-prod`

## Support Case Attempt

Azure Support service resolved through CLI:

- Service: `Web App (Linux)`
- Service ID: `/providers/Microsoft.Support/services/b452a42b-3779-64de-532c-8a32738357a6`
- Problem classification: `Application Code Deployment / Application issues post deployment`
- Problem classification ID: `/providers/Microsoft.Support/services/b452a42b-3779-64de-532c-8a32738357a6/problemClassifications/b14f7fde-14bc-2ff9-d612-697580802224`

Ticket creation was attempted with:

- Severity: `minimal`
- Diagnostic consent: `Yes`
- Technical resource: `app-jm1-productions-prod`
- Contact method: email

Azure rejected API submission with:

`InvalidSupportPlan`

Azure returned:

`Your support plan type is Developer. To create and update support tickets, and add communication operations, you need access to our high tier-support plans.`

## Case Status

Microsoft support case:

NOT OPENED

Reason:

Azure Support API submission is blocked by the current Developer support plan. A Portal-based flow may still require Jackie administrator interaction, support-plan confirmation, or support-plan upgrade.

## Prepared Support Case Metadata

Recommended title:

Target-specific Linux App Service runtime failure after successful OneDeploy and extracted ZIP deployment

Recommended service:

App Service / Web App (Linux)

Recommended problem classification:

Application Code Deployment / Application issues post deployment

Recommended severity:

C - Minimal business impact

Technical resource:

`/subscriptions/9ee13245-2303-4010-8b6d-35f7cbcfdc0e/resourceGroups/rg-jm1-web-prod-appsvc/providers/Microsoft.Web/sites/app-jm1-productions-prod`

## Recommended Portal Submission Summary

Use the following sanitized summary in Azure Portal:

`app-jm1-productions-prod` has a target-specific Azure App Service production runtime issue. The same governed minimal runtime artifact serves correctly on `app-jm1-one-prod`, `app-jm1-fin-prod`, and `app-jm1-foundation-prod`.

Runtime is `NODE|22-lts`, startup command is `node server.js`, and the governed artifact SHA-256 is `913fd27cdac46baadffe636527dc5582ed23125f91468d056127887fd5293652`.

OneDeploy initially completed successfully, but runtime returned 503. Diagnostics showed App Service skipped the package mount and `server.js` was absent from `/home/site/wwwroot`. We changed only this app to extracted ZIP mode with `WEBSITE_RUN_FROM_PACKAGE=0`, redeployed the same governed artifact, and deployment `e5153a3d-759e-4332-a860-ec23e7067d17` completed successfully. The app was restarted once, but `/` and `/api/health` still time out. Azure control plane reports the app as Running / Normal. SCM Basic and FTP Basic remain disabled. No customer domain or traffic is attached. No real Productions website is deployed.

Request Microsoft backend review of App Service, SCM, content-share, worker, startup, filesystem, and deployment diagnostics for `app-jm1-productions-prod`. Ask whether Microsoft can repair the resource in place, move it to another worker/stamp, clear backend metadata or content-share state, provide another supported remediation, or whether production app recreation is required.

## Evidence Attachments Prepared

Attach sanitized copies of:

- `gate-w3-operational-completion-stop-2026-07-30.md`
- `gate-w3-production-rollout-final-results.json`
- `productions-staging-peer-comparison.json`
- `productions-staging-repair-and-five-slot-staging-result.json`
- `productions-staging-repair-final-publishing-state.json`
- `checksums.sha256`

Do not attach publishing profiles, credentials, access tokens, secrets, connection strings, raw Key Vault values, or full environment exports.

## Required Next Action

Owner: Jackie

Use Azure Portal Help + support to open the support case for `app-jm1-productions-prod`, or approve/obtain the support-plan capability required for Cody/API-based ticket submission.

If Microsoft support requires a paid support-plan change, Jackie must approve that separately.

## Non-Actions Confirmed

- Production app recreation: 0
- JackieSmithJr production rollout: 0
- DNS changes: 0
- Customer traffic migration: 0
- Static Web Apps retirement: 0
- SCM Basic enablement: 0
- FTP Basic enablement: 0
- Real website deployments: 0
- Secret exposure: 0
