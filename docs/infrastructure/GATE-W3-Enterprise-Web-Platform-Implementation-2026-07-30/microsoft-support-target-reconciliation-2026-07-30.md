# Microsoft Support Target Reconciliation

Date: 2026-07-30
Gate: GATE-W3 Enterprise Web Platform Implementation
Execution owner: Cody

## Controlling Verification

The escalation directive named `app-jm1-fin-prod` as the blocked production target. Immediate verification on 2026-07-30 showed that target is no longer blocked.

Current runtime verification:

| Target | `/api/health` result | Property | Environment | Status |
| --- | --- | --- | --- | --- |
| `app-jm1-fin-prod` | 200 | `jmerrill.financial` | `production` | Healthy |
| `app-jm1-one-prod` | 200 | `jmerrill.one` | `production` | Healthy |
| `app-jm1-foundation-prod` | 200 | `jmerrill.foundation` | `production` | Healthy |
| `app-jm1-productions-prod` | Timeout | n/a | n/a | Blocked |

Azure control-plane readback for both `app-jm1-fin-prod` and `app-jm1-productions-prod` reported:

- `state=Running`;
- `availabilityState=Normal`;
- `linuxFxVersion=NODE|22-lts`;
- `startupFile=node server.js`.

The current material blocker is therefore `app-jm1-productions-prod`, not `app-jm1-fin-prod`.

## Support Case Disposition

Microsoft support case submission was not completed during this pass because the authorized support-case target in the directive conflicts with current verified evidence.

Opening a case against `app-jm1-fin-prod` would misidentify a healthy resource as failed. Opening a case against `app-jm1-productions-prod` would be the technically correct support target, but it differs from the explicit resource named in the escalation directive.

## Recommended Corrected Support Case

If Jackie confirms the corrected target, open the Microsoft Azure App Service support case for:

- Resource: `app-jm1-productions-prod`
- Resource group: `rg-jm1-web-prod-appsvc`
- App Service Plan: `asp-jm1-web-prod-linux`
- Region / SKU: Central US / Linux S1
- Issue type: Technical
- Service: App Service
- Problem type: Deployment / runtime availability
- Severity: C - Minimal business impact

Recommended title:

Target-specific Linux App Service production runtime and OneDeploy instability

Recommended summary:

`app-jm1-productions-prod` has a target-specific App Service runtime/content state failure. The same governed minimal runtime artifact serves correctly on `app-jm1-one-prod`, `app-jm1-fin-prod`, and `app-jm1-foundation-prod`. Productions initially failed after OneDeploy because the runtime started `node server.js` while `/home/site/wwwroot/server.js` was absent and the package mount was skipped. A targeted extracted ZIP repair completed OneDeploy successfully, but the public runtime continued to time out on `/api/health` after restart. Azure control plane reports the app as Running / Normal. SCM Basic and FTP Basic remain disabled. No customer domain or traffic is attached. No real Productions website is deployed.

Governed artifact SHA-256:

`913fd27cdac46baadffe636527dc5582ed23125f91468d056127887fd5293652`

Request Microsoft backend review of App Service, SCM, deployment, storage/content mount, worker, and runtime diagnostics that are not visible to the tenant. Ask whether Microsoft can repair the resource in place, move it to another worker or stamp, perform supported metadata/content-share cleanup, or whether production app recreation is required.

## Non-Actions Confirmed

- Microsoft case opened against `app-jm1-fin-prod`: 0
- Microsoft case opened against `app-jm1-productions-prod`: 0
- Production app recreation: 0
- Further production fan-out after Productions failure: 0
- DNS changes: 0
- Customer traffic migration: 0
- Static Web Apps retirement: 0
- SCM Basic enablement: 0
- FTP Basic enablement: 0
- Secret exposure: 0
