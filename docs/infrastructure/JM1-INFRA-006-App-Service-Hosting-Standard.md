# JM1-INFRA-006 App Service Hosting Standard

Status: Foundation Ready - awaiting Azure resource authorization  
Authority: Jackie  
Date: 2026-07-27  
Scope: JM1 application-enabled web properties, beginning with `jmerrill.pub`

## Purpose

JM1-INFRA-006 establishes Azure App Service as the long-term hosting standard for JM1 application-enabled web properties. Static Web Apps remains the active production host until a separately authorized migration and cutover are completed.

This standard does not authorize Azure resource creation, DNS changes, Static Web Apps retirement, production migration, or author/business workflow activation.

## Hosting Pattern

The approved target pattern is:

```text
GitHub Actions
  -> build package
  -> deploy to App Service staging slot
  -> warm /api/health
  -> runtime certification
  -> operator approval
  -> slot swap
  -> observe
  -> close deployment evidence
```

## Azure Topology

| Layer | Standard |
| --- | --- |
| Subscription | `JM1 - Nonprofit Core (2025 Grant)` |
| Tenant | `352d075e-8e17-4169-9f8e-22e6946ce66d` |
| Production region | Central US |
| DR strategy | Reproducible IaC plus backup region readiness in East US 2; no active-active in Phase 1 |
| Resource group | `rg-jm1-pub-prod-appsvc` |
| App Service Plan | Linux, S1 initially; P1v3 when sustained runtime load or availability need justifies |
| Web App | Linux Web App, Node 20 LTS |
| Slot strategy | Production plus `staging`; slot swap only after runtime certification |
| Telemetry | Application Insights workspace-based telemetry plus App Service diagnostics |
| Secret source | Azure Key Vault references; no secret values in source, workflow logs, Dataverse, or browser bundles |

## Naming Standard

| Resource | Production name |
| --- | --- |
| Resource group | `rg-jm1-pub-prod-appsvc` |
| App Service Plan | `asp-jm1-pub-prod-linux` |
| Publishing Web App | `app-jm1-pub-prod` |
| Publishing staging slot | `app-jm1-pub-prod/staging` |
| Application Insights | `appi-jm1-pub-prod` |
| Managed identity | system-assigned identity on `app-jm1-pub-prod` and slot |
| Diagnostic setting | `diag-jm1-pub-prod` |
| Key Vault | Existing governed vault, preferred `jm1-core-vault` unless Jackie authorizes a dedicated production vault |

## Required Tags

| Tag | Value |
| --- | --- |
| `program` | `JM1-INFRA-006` |
| `system` | `jmerrill-pub` |
| `owner` | `J Merrill One` |
| `environment` | `prod` or `staging` |
| `managedBy` | `bicep` |

## SKU Standard

| Option | SKU | Monthly estimate | Use |
| --- | --- | ---: | --- |
| Best Value | Linux S1 | about `$69.35` compute/month | Initial production migration target |
| Balanced | Linux P1v3 | about `$124.10` compute/month | Better performance headroom, Premium v3 platform |
| High Availability | Linux P1v3, 2 instances | about `$248.20` compute/month | Increased resilience after production usage warrants |

Estimates use Azure Retail Prices API Central US Linux App Service rates observed on 2026-07-27: S1 `$0.095/hour`; P1v3 `$0.17/hour`; 730 hours/month. Application Insights, bandwidth, custom domain, DNS, and Key Vault transaction costs are expected to be comparatively small at current traffic but must be monitored.

Current Static Web Apps production is `jmerrill-pub`, Central US, Free tier. Current compute cost is `$0` under the active Free tier, with operational limitations that motivated INFRA-006.

## Identity Standard

| Dependency | Preferred authentication | Phase 1 posture |
| --- | --- | --- |
| Key Vault | App Service managed identity | Required |
| Dataverse | Existing app registration initially; managed identity migration only after Dataverse service-principal validation | Hybrid |
| SharePoint/Graph | Existing app registration with least-privilege site/library access initially | Hybrid |
| ACS relay | Existing relay key through Key Vault reference | Secret-backed |
| Stripe | Restricted server key through Key Vault reference | Secret-backed |
| Business Central | Not active in publishing runtime; future app registration or managed identity plan required before production posting | Deferred |
| Storage/dead-letter | Managed identity preferred for future queue/storage | Planned |

## Secret Standard

All secrets must be Key Vault references in App Service app settings. The following must never be stored in source, generated JavaScript, Dataverse, SharePoint evidence, GitHub repository variables, or logs:

- Dataverse client secret
- SharePoint/Graph client secret
- Author Portal session secret
- Author access codes or registry JSON
- Turnstile secret key
- ACS/relay keys
- Stripe keys and webhook secrets
- orchestration worker key

## Runtime Configuration Standard

Production and staging must be separated through slot-specific settings where values can differ safely:

- `AUTHOR_PORTAL_SESSION_SECRET`
- author access registry and master access settings
- `NEXTAUTH_URL`
- `INTAKE_ALLOWED_ORIGINS`
- Turnstile keys
- Stripe mode and webhook secret, if staging uses test-mode Stripe

The commissioning payment gate remains:

```text
JM1_STRIPE_COMMISSIONING_PAYMENT_ENABLED=false
```

Enrollment completion, `details_submitted=true`, or `payouts_enabled=true` must not trigger payment release.

## Health Standard

`/api/health` is the App Service health endpoint.

It returns:

- service name
- release identifier
- checked timestamp
- payment gate state
- dependency readiness by category
- degraded or not-ready status without secret values

The endpoint must not return secrets, tokens, client secret hashes, author data, manuscript data, Dataverse record contents, SharePoint URLs for private artifacts, or Stripe account/link values.

## Production Gates

Azure resources may be created only after Jackie authorizes provisioning.

Production migration requires:

1. App Service resources provisioned from IaC.
2. Key Vault references resolve in staging and production.
3. staging deploy succeeds.
4. `/api/health` returns acceptable status.
5. `/join` synthetic intake proof passes.
6. Author Portal fail-closed and artifact-isolation proofs pass.
7. publishing notifications work.
8. logs expose no secrets or private author/manuscript data.
9. rollback point and SWA fallback are confirmed.
10. DNS cutover is separately authorized.

## Final Status

JM1-INFRA-006 hosting standard is Foundation Ready. Resource creation remains blocked pending Jackie authorization.
