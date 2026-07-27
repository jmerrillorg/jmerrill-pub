# JM1-INFRA-006 Publishing App Service Migration Runbook

Status: Foundation Ready - execution blocked pending Azure resource authorization  
Date: 2026-07-27  
Application: `jmerrill.pub`

## Boundary

This runbook prepares the migration sequence. It does not authorize Azure resource creation, production migration, DNS change, Static Web Apps retirement, or production cutover.

## Current Production

| Item | Current value |
| --- | --- |
| Host | Azure Static Web Apps |
| Resource | `jmerrill-pub` |
| Resource group | `jmerrill-pub` |
| Region | Central US |
| SKU | Free |
| Repository | `https://github.com/jmerrillorg/jmerrill-pub` |
| Branch | `main` |
| Production domain | `jmerrill.pub` |

## Target Production

| Item | Target |
| --- | --- |
| Resource group | `rg-jm1-pub-prod-appsvc` |
| App Service Plan | `asp-jm1-pub-prod-linux` |
| Web App | `app-jm1-pub-prod` |
| Slot | `staging` |
| Runtime | Node 20 LTS on Linux |
| Health path | `/api/health` |
| Secret path | Key Vault references |
| Telemetry | `appi-jm1-pub-prod` plus App Service diagnostic settings |

## Migration Order

1. Jackie authorizes Azure resource creation.
2. Deploy Bicep from `infra/jm1-infra-006/app-service/main.bicep` to `rg-jm1-pub-prod-appsvc`.
3. Grant App Service and staging slot managed identities Key Vault `get` access for required secrets.
4. Confirm all Key Vault references resolve.
5. Configure GitHub Actions App Service deployment workflow in a separate PR.
6. Deploy current `main` package to staging slot.
7. Warm staging.
8. Validate `/api/health`.
9. Run staging smoke tests.
10. Run production-like synthetic `/join` proof against staging.
11. Run Author Portal fail-closed and synthetic access proof against staging.
12. Confirm notification relay behavior.
13. Confirm no secrets or private data in logs.
14. Jackie approves cutover.
15. Swap staging to production.
16. Observe production health window.
17. Keep Static Web Apps as rollback host until post-cutover acceptance is signed off.
18. Retire SWA only under a later explicit retirement directive.

## Deployment Pipeline Design

```text
GitHub Actions
  -> checkout
  -> npm ci
  -> type-check
  -> lint
  -> build
  -> package
  -> deploy to staging slot
  -> warm /api/health
  -> runtime certification
  -> operator approval
  -> slot swap
  -> observe
  -> evidence closeout
```

## Staging Certification

| Check | Required result |
| --- | --- |
| `/api/health` | 200 with `ready` or approved `degraded` state |
| `/join` load | 200 |
| Turnstile invalid proof | controlled 400 |
| synthetic `/join` submission | 201 and one Dataverse intake |
| SharePoint manuscript storage | file present in governed path |
| publishing notification | delivered to `publishing@jmerrill.one` |
| duplicate retry | no duplicate Dataverse intake |
| Author Portal unauthenticated context | 401 |
| former fallback cookie | 401 |
| Author Portal valid synthetic fixture | success only if fixture is configured |
| logs | no secrets, tokens, author manuscript contents, or private data |

## Production Swap Gate

Swap is blocked unless:

- staging deploy succeeded;
- Key Vault references are resolved;
- `/api/health` passes;
- synthetic intake proof passes;
- Auth/Author Portal fail-closed proof passes;
- rollback endpoint is known;
- operator approval is recorded;
- DNS and certificate state are known.

## Rollback

Preferred rollback order:

1. Swap production back to previous slot state.
2. Restore prior App Service deployment package.
3. Route DNS back to Static Web Apps while SWA remains retained.
4. Disable risky feature flags or author portal access if a runtime authorization issue appears.

Never roll back by restoring a static Author Portal session-secret fallback, enabling the Stripe payment gate, or bypassing intake/author authorization.

## Evidence

Capture:

- GitHub run URL and SHA;
- Bicep deployment operation ID after provisioning is authorized;
- App Service deployment ID;
- `/api/health` JSON redacted only if needed;
- synthetic intake reference and Dataverse ID;
- SharePoint item ID and size;
- notification message ID;
- log-scan result;
- operator approval timestamp.

Do not capture:

- secrets;
- access tokens;
- raw author session cookies;
- raw Stripe account links;
- manuscript contents;
- private author data beyond minimum non-sensitive identifiers.

## Failure Handling

| Failure | Action |
| --- | --- |
| Bicep validation fails | do not deploy; fix IaC in PR |
| Key Vault reference unresolved | stop before staging certification |
| `/api/health` not-ready | classify dependency and stop unless approved degraded |
| `/join` synthetic proof fails | stop; do not cut over |
| Author Portal fail-closed proof fails | stop; do not cut over |
| notification failure after valid intake | preserve intake; route notification recovery |
| secret appears in logs | stop; rotate affected secret; invalidate evidence exposure |
| production swap defect | rollback through slot swap or SWA fallback |

## Remaining Authorization

Jackie must authorize:

- Azure resource creation;
- Key Vault access grants;
- App Service deployment workflow activation;
- DNS cutover;
- Static Web Apps retirement, later and separately.
