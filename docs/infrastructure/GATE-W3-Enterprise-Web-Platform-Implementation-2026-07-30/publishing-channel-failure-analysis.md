# GATE-W3 Publishing Channel Failure Analysis

Status: PARTIAL - publishing infrastructure failure confirmed
Last verified: 2026-07-30T04:15:00Z
Execution owner: Cody
Authority: GATE-W3 JMerrill.Pub App Service Reference Completion continuation

## Scope

This record covers the attempt to restore a supported App Service publishing path for the governed GATE-W3 minimal runtime artifact across the five authorized enterprise web App Services and their staging slots.

No production DNS cutover, customer-domain attachment, Static Web Apps retirement, production website deployment, or live traffic migration was performed.

## Targets

- app-jm1-fin-prod / production
- app-jm1-fin-prod / staging
- app-jm1-one-prod / production
- app-jm1-one-prod / staging
- app-jm1-foundation-prod / production
- app-jm1-foundation-prod / staging
- app-jm1-productions-prod / production
- app-jm1-productions-prod / staging
- app-jm1-jackiesmithjr-prod / production
- app-jm1-jackiesmithjr-prod / staging

## Finding Summary

The publishing failure is not caused by DNS, app access restrictions, EasyAuth, private networking, resource locks, or missing app runtime configuration.

The failure is isolated to the App Service publishing surface for the GATE-W3 resource group:

1. SCM hostnames resolve.
2. SCM endpoints respond with Basic authentication challenges.
3. App-level and SCM-level access restrictions allow public access.
4. EasyAuth is disabled.
5. Resource locks are absent.
6. Deployment Center source control is not configured on the GATE-W3 apps.
7. Publishing profile metadata exists, but both SCM and FTP basic publishing policies are disabled.
8. Direct Kudu ZIP deploy returns HTTP 401.
9. FTPS rejects login.
10. GitHub Actions OIDC authentication works after using the existing `jmerrill-pub-staging` environment subject.
11. The existing GitHub OIDC deployment identity required `Website Contributor` on `rg-jm1-web-prod-appsvc`; the same role already existed on the Publishing reference resource group.
12. After least-privilege RBAC alignment, Azure configuration writes succeed.
13. `azure/webapps-deploy@v3` reaches "Package deployment using OneDeploy initiated" but times out after 12 minutes on all 10 GATE-W3 targets.
14. The minimal runtime artifact does not become healthy on `/api/health` for any target.

## Reference Comparison

The certified Publishing reference app (`app-jm1-pub-prod`) differs materially from the GATE-W3 apps:

- `app-jm1-pub-prod` SCM basic publishing policy: allowed
- `app-jm1-pub-prod` FTP basic publishing policy: allowed
- GATE-W3 apps SCM basic publishing policy: disabled
- GATE-W3 apps FTP basic publishing policy: disabled

The existing successful Publishing App Service workflow therefore does not yet prove a Basic-disabled App Service publishing path for the new enterprise web apps.

## Attempts

### Local Kudu ZIP Deploy

Result: failed.

Observed outcome:

- SCM host resolves.
- Kudu ZIP deploy endpoint returns HTTP 401.
- No credential values printed or stored.

### FTPS

Result: failed.

Observed outcome:

- FTPS endpoint reached.
- Login rejected with `530 User cannot log in`.
- FTPS was returned to disabled state after the test.
- No credential values printed or stored.

### GitHub Actions OIDC - branch subject

Run: `30512501720`

Result: failed before deployment.

Observed outcome:

- Azure Login rejected the branch-ref OIDC subject.
- No deployment was attempted.

### GitHub Actions OIDC - environment subject

Run: `30512553314`

Result: failed before deployment.

Observed outcome:

- Azure Login succeeded through the existing `jmerrill-pub-staging` environment subject.
- The OIDC service principal lacked required App Service configuration permissions on `rg-jm1-web-prod-appsvc`.

Repair applied:

- Assigned `Website Contributor` to the existing `jm1-pub-github-actions-oidc` service principal on `rg-jm1-web-prod-appsvc`.
- This mirrors its existing role on the certified Publishing reference resource group.
- No tenant-wide role, Owner role, policy change, or Basic publishing enablement was applied.

### GitHub Actions OIDC - OneDeploy after RBAC alignment

Run: `30512642852`

Result: failed during deployment.

Observed outcome:

- Artifact built successfully.
- Checksum verification succeeded.
- Azure Login succeeded.
- App Service runtime configuration succeeded.
- `azure/webapps-deploy@v3` started OneDeploy.
- Each target timed out after 12 minutes.
- `/api/health` timed out on all ten targets after the failed deployment attempt.

## Current Component Classification

Component responsible: App Service publishing channel for Basic-disabled Linux App Service targets.

Classification:

- Tenant: no tenant-wide outage proven.
- Subscription: no subscription lock or broad policy assignment proven beyond Defender/Security Center default initiative.
- App Service configuration: confirmed material difference from the working reference path because SCM and FTP basic publishing are disabled on the GATE-W3 apps.
- Microsoft platform: not conclusively proven; OneDeploy timeout across all ten targets may require Microsoft support if a Basic-disabled OneDeploy path is required.

## Why Basic Publishing Was Not Enabled

Enabling SCM or FTP basic publishing would materially weaken the current GATE-W3 security posture. The governing instruction explicitly prohibited weakening Azure security merely to make deployment work.

Therefore, no SCM/FTP Basic policy was enabled.

## Runtime Certification

Runtime certification did not pass.

| Target class | Result |
| --- | --- |
| Minimal runtime artifact build | PASS |
| Checksum verification | PASS |
| GitHub OIDC authentication | PASS |
| GATE-W3 App Service RBAC | PASS after least-privilege alignment |
| OneDeploy completion | FAIL - timed out |
| `/api/health` certification | FAIL - all ten targets timed out |
| 5/5 production app health | FAIL |
| 5/5 staging slot health | FAIL |

## Required Next Action

Select one governed path:

1. Microsoft-supported Basic-disabled package deployment path for Linux App Service, with Microsoft support if needed.
2. Jackie-approved temporary SCM Basic publishing exception for the GATE-W3 deployment window, followed by immediate re-disablement and evidence.
3. Alternative architecture using container image deployment through Azure Container Registry or another approved non-Basic deployment mechanism.

Until one path is approved and proven:

- GATE-W3 remains PARTIAL.
- Production DNS cutover remains NO-GO.
- Static Web Apps retirement remains NO-GO.
- No additional web property migration is authorized.

## Unauthorized Actions Confirmation

The following did not occur:

- Production DNS cutover
- Customer-domain attachment
- Static Web Apps retirement
- Production website application deployment
- Live traffic migration
- Secret exposure
- FTPS/SCM Basic enablement
- Azure policy disablement
- Evidence deletion
