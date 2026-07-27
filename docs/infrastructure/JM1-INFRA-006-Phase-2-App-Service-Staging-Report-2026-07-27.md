# JM1-INFRA-006 Phase 2 App Service Staging Report

Date: 2026-07-27

Status: PARTIALLY COMPLETE - APP SERVICE FOUNDATION PROVISIONED; POSITIVE SYNTHETIC BUSINESS-PATH PROOFS PENDING

## Baseline

- Foundation PR: #347
- Foundation source commit: `b436068d6c8887884d1c2de5210972326b314d7a`
- Merge commit to `main`: `854df94baba0dd2c9cc206796c98c52995bbc718`
- Static Web Apps production runtime: retained and verified healthy
- DNS cutover: not executed
- Static Web Apps retirement: not authorized and not performed

## Azure Foundation

- Subscription: `JM1 - Nonprofit Core (2025 Grant)`
- Subscription ID: `9ee13245-2303-4010-8b6d-35f7cbcfdc0e`
- Tenant ID: `352d075e-8e17-4169-9f8e-22e6946ce66d`
- Region: Central US
- Resource group: `rg-jm1-pub-prod-appsvc`
- App Service Plan: `asp-jm1-pub-prod-linux`
- SKU: S1 Linux
- Initial instance count: 1
- Web App: `app-jm1-pub-prod`
- Staging slot: `staging`
- Staging hostname: `https://app-jm1-pub-prod-staging.azurewebsites.net`
- Application Insights: `appi-jm1-pub-prod`
- Log Analytics workspace: `9ee13245-2303-4010-8b6d-35f7cbcfdc0e-rg-jm1-core-EUS`
- Key Vault: `jm1-core-vault`

## Deployments

Infrastructure deployments:

- `jm1-infra006-appsvc-phase2-20260727185220`: succeeded
- `jm1-infra006-appsvc-phase2-config-20260727185447`: succeeded
- `jm1-infra006-appsvc-phase2-prebuilt-20260727190225`: succeeded
- `jm1-infra006-appsvc-phase2-standalone-20260727154505`: succeeded, correlation `59521463-714e-4eb7-808a-2cb1c61a7352`

Application deployment:

- Active Kudu deployment: `e1dd1e88-28a7-4577-a9fe-999e23c0b696`
- Artifact type: Next.js standalone App Service package
- Artifact SHA-256: `e425e3eb3cd3c3f45e644bcfe1480f664a0afe586d96d1733cbfd7b1b7b26c0a`
- Startup command: `node server.js`

The initial full `node_modules` deployment started with `npm start` and failed under App Service Linux because platform module relocation broke the `next` executable path. The corrected App Service packaging uses Next standalone output and starts from `server.js`.

## Identity And Configuration

Managed identities:

- Production web app principal ID: `3b468411-65a4-4371-84bd-921acb133fb5`
- Staging slot principal ID: `682509f2-446c-463f-bdd8-14da2b5baaf7`

Key Vault access:

- Both app identities have `Key Vault Secrets User` scoped to `jm1-core-vault`.
- No broad tenant permission was introduced.
- Storage/dead-letter access currently uses a Key Vault-backed storage connection string. Managed identity queue access remains the preferred future state.

Runtime settings are Key Vault-backed where secret-bearing. Secret values, tokens, cookies, access codes, Account Links, and manuscript contents were not recorded.

Additional governed secret created for App Service durable auth:

- `AUTH-SECRET`

Both `AUTH_SECRET` and `NEXTAUTH_SECRET` reference `AUTH-SECRET`.

Payment gate:

- `JM1_STRIPE_COMMISSIONING_PAYMENT_ENABLED=false`
- Health endpoint reports `paymentGate=disabled`.

## Runtime Results

Public runtime:

- `/api/health`: 200, ready
- `/`: 200
- `/join`: 200
- `/api/publishing/intake/config`: 200
- `/favicon.ico`: 200

Health stability:

- 10 consecutive `/api/health` probes succeeded.
- Warm health responses ranged from 67 ms to 318 ms during the observation window.

Security and authorization:

- Unauthenticated `/api/author/context`: 401
- Cookie signed with the former static fallback: rejected for author context with 401
- Deployed HTML and sampled JavaScript bundles: no detected secret, token, cookie, Stripe Account Link, or local operator path leakage
- Startup and deployment logs scanned: no detected secret, token, cookie, Stripe Account Link, manuscript content, or local operator path leakage

Publishing intake:

- Intake configuration endpoint: 200
- Invalid Turnstile: controlled 400 with `turnstile_verification_failed`
- Positive synthetic intake proof: pending; requires browser Turnstile execution and governed synthetic manuscript fixture
- Duplicate-idempotency proof: pending; depends on positive synthetic intake
- Notification delivery proof: pending; depends on positive synthetic intake

Author Operating Center:

- Unauthenticated context fail-closed: pass
- Former-fallback forged session: pass for author context
- Valid synthetic author session: pending; requires governed synthetic access registry and author fixture
- Own artifact download: pending; requires governed synthetic artifact fixture
- Cross-author artifact denial: pending; requires governed paired synthetic artifact fixture

## Monitoring

Action group:

- `ag-jm1-pub-infra006-ops`
- Owner route: `jm1-admin@jmerrill.one`

Metric alerts:

- `alert-jm1-pub-appsvc-http5xx`: severity 2, total `Http5xx > 5` over 5 minutes, evaluated every 1 minute
- `alert-jm1-pub-appsvc-response-time`: severity 3, average `AverageResponseTime > 10` seconds over 5 minutes, evaluated every 1 minute

Additional health-endpoint and dependency-specific alerts should be added before cutover after final synthetic business-path certification is complete.

## Rollback

- Static Web Apps production host remained healthy and unchanged during Phase 2.
- App Service staging has multiple successful Kudu deployment records, with `e1dd1e88-28a7-4577-a9fe-999e23c0b696` active.
- The standalone artifact can be redeployed to staging without restoring the static Author Portal fallback, enabling payment execution, broadening permissions, or changing DNS.
- DNS rollback remains a future cutover procedure because no DNS cutover occurred in this phase.

## Cost Posture

- App Service Plan S1 Linux, one instance.
- Staging slot shares the App Service Plan compute and does not add a second plan charge.
- Application Insights and Log Analytics are usage-based.
- Baseline monthly posture remains consistent with the Phase 1 S1 estimate. Scaling, P1v3 upgrade, or adding `jmerrill.one` to this plan remains a separate capacity decision.

## Exceptions

The App Service foundation and runtime shell are working, but full staging certification is not complete because the positive synthetic business-path proofs were not completed:

1. Valid `/join` synthetic intake through Turnstile, Dataverse, SharePoint, notification, and idempotency.
2. Valid synthetic Author Operating Center session and artifact access pair proving own-artifact success and cross-author denial.

These are runtime certification gates, not reasons to change DNS or cut over production traffic.

## Cutover Recommendation

Recommendation: NO-GO for production cutover.

Required before cutover authorization:

1. Complete governed positive synthetic `/join` intake proof on App Service staging.
2. Complete governed synthetic Author Operating Center session and artifact proof on App Service staging.
3. Expand monitoring to health/dependency-specific alerts.
4. Preserve final non-sensitive evidence.
5. Jackie explicitly authorizes DNS/cutover timing after reviewing the completed certification package.

No DNS change, production traffic migration, Static Web Apps retirement, Stripe payment action, Business Central posting, broad author activation, secret exposure, or destructive evidence action occurred.
