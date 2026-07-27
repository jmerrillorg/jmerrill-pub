# JM1-INFRA-006 Publishing App Service Migration Runbook

**Classification:** Operational migration runbook
**Status:** Draft for Jackie review
**Authority:** JM1-INFRA-006 App Service Hosting Standard
**Date:** 2026-07-27
**Scope:** Planning only. No Azure resource creation, DNS cutover, production deployment, or Static Web Apps retirement is authorized by this runbook.

## Objective

Move `jmerrill.pub` from Azure Static Web Apps to Azure App Service only after the App Service runtime proves the current certified Publishing capabilities with stronger deployment, identity, configuration, health, and rollback controls.

## Starting Posture

| Area | Current posture | Migration rule |
| --- | --- | --- |
| Public production runtime | Azure Static Web Apps | Keep running until App Service cutover is certified and approved |
| Repository authority | `main` | Branch migration work from current authoritative `main` or approved infrastructure branch |
| Package manager | `npm` and `package-lock.json` | Preserve npm authority |
| Author Portal | Certified on current SWA preview for security and artifact access | Re-certify on App Service staging |
| Payments | Enrollment governance only; payment execution unauthorized | Keep `JM1_STRIPE_COMMISSIONING_PAYMENT_ENABLED=false` |
| ACS relay | Separate Function App | Keep separate unless separate architecture approves change |
| Business Central | Financial source of truth, production posting separately gated | Do not mix migration with BC royalty implementation |

## Wave 1 - Foundation Readiness

### 1. Resource Design

Define the target Azure resources before creating them:

| Resource | Proposed naming | Notes |
| --- | --- | --- |
| Resource group | Existing governed JM1 app resource group or `rg-jm1-apps-prod` if approved | Must align with Azure tagging and cost reporting |
| App Service Plan | `asp-jm1-apps-prod-centralus` | Shared plan allowed for application-enabled brands |
| Web App | `jm1-publishing-web` | Dedicated app resource and identity |
| Staging slot | `staging` | Required for pre-swap proof |
| Managed identity | System-assigned by default, user-assigned if architecture requires shared identity control | Must be documented before Key Vault access |
| Application Insights | `appi-jm1-publishing-prod` or existing governed workspace | Must capture health gate and runtime telemetry |
| Key Vault | `jm1-core-vault` unless architecture approves replacement | Secret values must remain outside source and logs |

No resource should be created until the design is reviewed and the subscription, region, naming, tags, budget impact, and owner are confirmed.

### 2. Configuration Contract

Inventory runtime settings and classify each as secret, non-secret, production-only, staging-safe, or obsolete.

Minimum required groups:

- Dataverse URLs and authentication;
- Microsoft Graph identity and site/library references;
- Author Portal session secret;
- Author Portal access registry;
- Stripe Author Payout Enrollment secret path;
- ACS relay endpoint and auth;
- Business Central references where applicable;
- feature gates including `JM1_STRIPE_COMMISSIONING_PAYMENT_ENABLED=false`;
- release and health metadata.

Rules:

- No `NEXT_PUBLIC_*` value may contain secrets or sensitive operational configuration.
- App Service runtime settings must be sufficient without relying on GitHub Actions build-only environment variables.
- Key Vault references or managed-identity retrieval are preferred for secrets.
- Staging and production must use separated settings where live author data or live transaction risk differs.

### 3. Infrastructure As Code

Prepare infrastructure as code before live resource creation.

Minimum infrastructure definition:

- App Service Plan;
- Linux Web App;
- staging slot;
- managed identity;
- App Settings and Key Vault references;
- Health Check path;
- Application Insights linkage;
- tags;
- custom-domain placeholders;
- role assignments;
- outputs for deployment pipeline.

Do not import existing ad hoc portal changes as authority unless the final configuration is exported and reconciled.

## Wave 2 - Application Packaging

Prepare the Next.js runtime for App Service.

Checklist:

- Preserve Next.js server behavior required by Author Operating Center.
- Confirm Node version support and `PORT` binding.
- Confirm `npm ci`, `npm run build`, and `npm run start` or approved startup command.
- Confirm static assets and public metadata load.
- Confirm server routes execute in App Service runtime, not only build time.
- Confirm health endpoint can run without revealing secrets.
- Confirm logs redact secrets, tokens, cookies, access codes, Account Links, and author-sensitive data.

## Wave 3 - Staging Deployment

Deploy to App Service staging slot first.

Required sequence:

```text
build artifact
  -> deploy to App Service staging slot
  -> verify startup
  -> verify /api/health
  -> run production-like runtime certification
  -> preserve non-sensitive evidence
```

Staging proof must include:

| Capability | Required result |
| --- | --- |
| Homepage and public routes | 200 responses and expected content |
| Author Portal loads | No configuration or session-signing errors |
| Unauthenticated author context | Fails closed |
| Former fallback session | Rejected |
| Valid synthetic author session | Issued and validated |
| Own artifact download | 200 through governed runtime path |
| Cross-author artifact request | Non-disclosing denial |
| Marketing profile isolation | Trusted session identity enforced |
| Logout | Session invalidated |
| Stripe enrollment | No charges, transfers, refunds, payouts, or Account Link persistence |
| ACS relay | Degraded relay does not break public site |
| Logs | No secrets, tokens, local paths, raw cookies, access codes, or sensitive author data |

## Wave 4 - Cutover Readiness

Do not proceed to DNS or slot swap until:

1. PR or infrastructure change is merged through normal review.
2. App Service staging validation passes.
3. Health gate produces a clean observation window.
4. Rollback route is tested.
5. Static Web Apps current production remains available as rollback.
6. Jackie approves production cutover.
7. DNS TTL and certificate plan are confirmed.
8. Monitoring and alerting owners are ready.

## Wave 5 - Production Cutover

Preferred cutover:

```text
deploy to staging slot
  -> warm staging
  -> run health and runtime certification
  -> swap staging into production
  -> monitor production health window
  -> preserve evidence
```

DNS cutover should occur only when custom-domain and certificate handling require it. If App Service can be warmed and validated behind a staging hostname before DNS movement, do that first.

## Rollback

Rollback options in preferred order:

1. Slot swap back to prior production slot if App Service cutover used slots.
2. Restore previous App Service deployment artifact.
3. Restore DNS to Static Web Apps while it is retained as rollback.
4. Disable affected authenticated workspace routes while preserving public site availability.

Never roll back by:

- restoring static session-secret fallback;
- exposing secrets in configuration;
- granting broad Graph or SharePoint permissions;
- enabling payment execution;
- delivering Stripe links to authors without approval.

## Evidence Requirements

Preserve non-sensitive evidence for:

- source commit and deployment artifact hash;
- App Service resource IDs;
- managed identity principal IDs;
- Key Vault reference presence, not secret values;
- staging and production health results;
- runtime certification matrix;
- deployment slot swap timestamp;
- DNS/certificate state;
- log scan result;
- rollback readiness;
- Jackie approval.

Do not preserve:

- secret values;
- access tokens;
- raw cookies;
- access codes;
- Account Link URLs;
- live author sensitive data;
- banking or tax data.

## Exception Register

| Exception | Classification | Current handling |
| --- | --- | --- |
| INFRA-005 PR not merged at time of INFRA-006 package creation | Dependency open | Carry doctrine forward; do not modify PR #341 |
| Existing production restored through Static Web Apps artifact while `main` contains later code | Known operational distinction | App Service migration must branch from authoritative repository baseline but validate runtime independently |
| Static Web Apps remains available after cutover | Intentional rollback retention | Retire only after stabilization window and Jackie acceptance |
| Business Central royalty implementation | Separate workstream | Do not combine with hosting migration |

## Go / No-Go

| State | Meaning |
| --- | --- |
| GO for planning | This runbook may be refined, reviewed, and converted into infrastructure tickets |
| CONDITIONAL GO for resource creation | Requires approved resource design, IaC, cost posture, and credential plan |
| CONDITIONAL GO for staging deployment | Requires resource foundation complete and secrets configured through governed paths |
| NO-GO for production cutover | Until staging certification, rollback proof, health window, and Jackie approval complete |

## Current Status

**JM1-INFRA-006 = INITIATED**

No production hosting migration has occurred.
