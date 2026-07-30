# Microsoft Support Escalation Attempt: Productions App Service

Date: 2026-07-30
Attempt timestamp: 2026-07-30T17:10:45Z
Gate: GATE-W3 Enterprise Web Platform Implementation
Execution owner: Cody
Authorized target: `app-jm1-productions-prod`
Resource group: `rg-jm1-web-prod-appsvc`
App Service plan: `asp-jm1-web-prod-linux`

## Classification

PARTIALLY COMPLETE - SUPPORT PLAN / PORTAL SUBMISSION EXCEPTION

GATE-W3 remains blocked because Microsoft backend diagnostics are required for the Productions production App Service target, but Azure Support API ticket creation is blocked by the current support-plan entitlement.

## Corrected Target Confirmation

Jackie confirmed that the Microsoft support target is:

- Resource: `app-jm1-productions-prod`
- Resource group: `rg-jm1-web-prod-appsvc`
- App Service plan: `asp-jm1-web-prod-linux`

The earlier `app-jm1-fin-prod` reference is superseded. Financial is healthy and is excluded from the support case.

Current target disposition:

| Target | Status | Support disposition |
| --- | --- | --- |
| `app-jm1-fin-prod` | Healthy | Excluded |
| `app-jm1-productions-prod` | Blocked | Support target |

## Support Request Configuration Prepared

Issue type: Technical
Service: App Service / Web App (Linux)
Service identifier: `b452a42b-3779-64de-532c-8a32738357a6`
Problem classification: Application Code Deployment / Application issues post deployment
Problem classification identifier: `b14f7fde-14bc-2ff9-d612-697580802224`
Severity: C - Minimal business impact
Advanced diagnostic consent: Yes
Technical resource:
`/subscriptions/9ee13245-2303-4010-8b6d-35f7cbcfdc0e/resourceGroups/rg-jm1-web-prod-appsvc/providers/Microsoft.Web/sites/app-jm1-productions-prod`

Suggested title:

Target-specific Linux App Service runtime failure after successful OneDeploy and extracted ZIP deployment

## Sanitized Technical Summary

`app-jm1-productions-prod` is a target-specific Linux App Service runtime failure.

Known healthy comparators:

- `app-jm1-productions-prod/staging` is healthy.
- `app-jm1-foundation-prod` is a healthy production peer.
- `app-jm1-fin-prod` is healthy and is not the support target.

Runtime and deployment facts:

- Runtime: `NODE|22-lts`
- Startup command: `node server.js`
- Governed minimal runtime artifact SHA-256: `913fd27cdac46baadffe636527dc5582ed23125f91468d056127887fd5293652`
- OneDeploy initially succeeded, but package mount was skipped and `server.js` was absent.
- Extracted ZIP mode with `WEBSITE_RUN_FROM_PACKAGE=0` was attempted.
- Deployment `e5153a3d-759e-4332-a860-ec23e7067d17` completed.
- `/` and `/api/health` still time out.
- Azure control plane reports the app as running.
- SCM Basic and FTP Basic remain disabled.
- No customer domain or traffic is attached.

Microsoft should inspect:

- content-share and `/home/site/wwwroot` state;
- worker and runtime startup;
- process launch and port binding;
- stale deployment metadata;
- app-specific worker assignment;
- backend health after the successful deployment;
- whether in-place repair, worker or stamp movement, supported metadata cleanup, or recreation is required.

## Submission Attempt Result

Support ticket creation was attempted through Azure Support CLI after corrected target authorization.

Result:

Microsoft case: NOT OPENED

Azure returned:

`InvalidSupportPlan`

The Azure Support API reported that the current support plan type is Developer and that create/update ticket and communication operations require a higher-tier support plan.

No case number was issued.

Subscription support-ticket list readback returned no visible existing tickets for Cody to attach this escalation to during this pass.

Azure Portal Help + support was also inspected under the signed-in `jm1-admin@jmerrill.one` session. The Portal accepted:

- service: `Web App (Linux)`;
- subscription: `JM1 – Nonprofit Core (2025 Grant)`;
- issue classification: `Application issues post deployment`.

The Portal resource picker did not expose `app-jm1-productions-prod`; under the resource-not-available path, the workflow surfaced troubleshooting guidance and support resources / Microsoft Q&A rather than a technical support case submission form. This is consistent with the API `InvalidSupportPlan` result.

Live `jm1_executionlog` writeback was not performed. No approved GATE-W3 Microsoft-support event type or live write contract was identified in the repository during this pass, and Cody did not invent a Dataverse event shape. The governed evidence record and PR update preserve the support-escalation attempt until an approved execution-log event contract is available.

## Required Jackie / Administrator Action

Use Azure Portal Help + support to submit the prepared sanitized case for `app-jm1-productions-prod`, or approve/obtain the support-plan capability required to create and manage the case programmatically.

If Azure Portal also blocks case creation because of support-plan entitlement, Jackie must decide whether to obtain a higher support plan or route the issue through an available Microsoft support channel.

Paid support-plan changes require separate Jackie approval.

## Attachment Boundary

Attach only sanitized evidence:

- Productions failure summary;
- deployment and configuration readbacks;
- package-mount evidence;
- extracted ZIP repair evidence;
- health probes;
- Foundation peer comparison;
- checksums;
- relevant timestamps and deployment IDs.

Do not attach:

- credentials;
- publishing profiles;
- access tokens;
- full environment exports;
- Key Vault values.

## Current GATE-W3 State

Microsoft support case: NOT OPENED
Affected target: `app-jm1-productions-prod`
Case status: BLOCKED - SUPPORT PLAN / PORTAL SUBMISSION REQUIRED
GATE-W3: BLOCKED - MICROSOFT DIAGNOSTIC REQUIRED
Production fan-out: HELD

## Non-Actions Confirmed

- Microsoft case opened against `app-jm1-fin-prod`: 0
- Production app recreation: 0
- App Service Plan resize: 0
- DNS changes: 0
- Customer traffic migration: 0
- Static Web Apps retirement: 0
- SCM Basic enablement: 0
- FTP Basic enablement: 0
- Real Productions website deployment: 0
- Secret exposure: 0
