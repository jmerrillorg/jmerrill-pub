# JM1-INFRA-006 Phase 2 App Service Staging Report

Date: 2026-07-27
Updated: 2026-07-28

Status: BLOCKED - APP SERVICE STAGING SOURCE AND WORKER ROUTE REFRESHED; POSITIVE SYNTHETIC BUSINESS-PATH PROOFS BLOCKED BY TURNSTILE HOSTNAME CONFIGURATION AND MISSING AUTHOR SYNTHETIC FIXTURE

## Baseline

- Foundation PR: #347
- Foundation source commit: `b436068d6c8887884d1c2de5210972326b314d7a`
- Merge commit to `main`: `854df94baba0dd2c9cc206796c98c52995bbc718`
- Static Web Apps production runtime: retained and verified healthy
- Current production source authority before staging refresh: `f3f2a9fc96627fc23327e58b7eddbe6f50365a93`
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

- Previous active Kudu deployment: `e1dd1e88-28a7-4577-a9fe-999e23c0b696`
- Refreshed Kudu deployment: `c4b25195-6eb5-4c0c-9360-ead6f5e0eb28`
- Artifact type: Next.js standalone App Service package
- Previous artifact SHA-256: `e425e3eb3cd3c3f45e644bcfe1480f664a0afe586d96d1733cbfd7b1b7b26c0a`
- Refreshed artifact SHA-256: `b7ba6bbe7938ccf158d6b02288386ed160fb0f0616030f7329b980ac707614c1`
- Startup command: `node server.js`

The initial full `node_modules` deployment started with `npm start` and failed under App Service Linux because platform module relocation broke the `next` executable path. The corrected App Service packaging uses Next standalone output and starts from `server.js`.

The 2026-07-28 refresh deployed a standalone artifact rebuilt from the PR branch after merging current `origin/main` at `f3f2a9fc96627fc23327e58b7eddbe6f50365a93`. An initial CLI deployment left Kudu in an incomplete `Receiving changes` state, so the same verified zip was deployed through Kudu async zipdeploy. Kudu marked deployment `c4b25195-6eb5-4c0c-9360-ead6f5e0eb28` successful and active.

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

Slot-specific settings are governed through the App Service `slotConfigNames` resource so later slot-swap work does not silently exchange staging and production runtime values.

Post-refresh orchestration settings:

- `JM1_DIAGNOSTIC_RUNNER_URL`: configured as a slot-sticky non-secret App Service setting.
- `JM1_DIAGNOSTIC_RUNNER_KEY`: configured as a slot-sticky Key Vault reference to `jm1-int-pub-005-diagnostic-runner-key`.
- `JM1_ORCHESTRATION_WORKER_KEY`: configured as a slot-sticky Key Vault reference to `JM1-ORCHESTRATION-WORKER-KEY`.
- The App Service staging slot identity already has Key Vault Secrets User access to `jm1-core-vault`.
- Worker-key alignment was verified without exposing the value.

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
- `/api/publishing/orchestration/intake-autostart`: deployed and indexed under the refreshed standalone artifact.

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
- Unauthenticated worker call to `/api/publishing/orchestration/intake-autostart`: 401
- Authenticated worker call with malformed intake ID: 400 with `invalid_intake_id`
- Positive synthetic intake proof: blocked. Browser Turnstile execution on `https://app-jm1-pub-prod-staging.azurewebsites.net/join` produced Cloudflare Turnstile client error `110200`, documented by Cloudflare as domain not authorized. The staging hostname must be authorized on the current widget or a staging-specific governed Turnstile widget must be configured before a real token-bearing `/join` submission can be completed.
- 2026-07-28 continuation: Cloudflare dashboard access was attempted through the available browser session, but the session was unauthenticated and required Cloudflare login. No unrestricted hostname mode was enabled and no Turnstile secret was exposed. The hostname addition remains the current material external-admin blocker.
- Duplicate-idempotency proof: blocked by positive synthetic intake proof.
- Notification delivery proof: blocked by positive synthetic intake proof.

Author Operating Center:

- Unauthenticated context fail-closed: pass
- Former-fallback forged session: pass for author context
- Staging session secret and access settings: configured through Key Vault references.
- 2026-07-28 governed synthetic fixture: created two preview-only synthetic authors, Contacts, intakes, Opportunities, titles, publishing assets, editorial stages, approval gates, summaries, and text artifacts. No real author credentials or manuscript content were used.
- Temporary fixture route: a preview-only access registry and synthetic master access code were applied to App Service staging and then restored to the original Key Vault-backed references. The `/api/author/gate` route continued to reject the temporary access code with `401 Invalid access code`, so App Service staging credential issuance remains unproven.
- Governed signed synthetic session path: using the staging `AUTHOR_PORTAL_SESSION_SECRET` inside the certification runner without printing or preserving the cookie value, Author A context resolved with HTTP 200, matched the synthetic Contact, and projected exactly one Author A artifact.
- Author A own-artifact download: HTTP 200, filename matched the fixture, MIME type `text/plain; charset=utf-8`, and SHA-256 matched `3d8132cac22356e5733fc793fd17131d7e14aaa47957c274da1220e0cd347ca6`.
- Author A to Author B artifact request: non-disclosing 404.
- Unauthenticated artifact request: 401.
- Former-fallback forged-session artifact request: 401.
- Logout: 200; post-logout context request returned 401.
- Cleanup: App Service staging settings restored to Key Vault references; synthetic Dataverse rows and temporary SharePoint `_certification/INFRA006-AOC-*` folders removed; final cleanup scan found zero matching synthetic Contacts, intakes, titles, Opportunities, editorial artifacts, or temporary SharePoint folders.

## Monitoring

Action group:

- `ag-jm1-pub-infra006-ops`
- Owner route: `jm1-admin@jmerrill.one`

Metric alerts:

- `alert-jm1-pub-appsvc-http5xx`: severity 2, total `Http5xx > 5` over 5 minutes, evaluated every 1 minute
- `alert-jm1-pub-appsvc-response-time`: severity 3, average `AverageResponseTime > 10` seconds over 5 minutes, evaluated every 1 minute

Additional health-endpoint and dependency-specific alerts should be added before cutover after final synthetic business-path certification is complete. The current metric alerts cover HTTP 5xx and response time only.

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

The App Service foundation and refreshed runtime shell are working, and the Author Operating Center context/artifact authorization path has been positively proven through a governed signed synthetic session. Full staging certification remains blocked because the `/join` positive path still cannot obtain a valid Turnstile token for the App Service staging hostname, and the App Service `/api/author/gate` route did not accept temporary synthetic staging access-code settings during the continuation pass.

1. Turnstile hostname authorization for `app-jm1-pub-prod-staging.azurewebsites.net` or a staging-specific governed Turnstile site/secret pair.
2. Valid `/join` synthetic intake through Turnstile, Dataverse, SharePoint, notification, and idempotency after Turnstile is corrected.
3. App Service staging author-session issuance through `/api/author/gate`, or a configuration diagnosis explaining why temporary staging access-code settings were not visible to that route after readback and restart. The context, artifact, cross-author denial, unauthenticated denial, forged fallback denial, and logout paths are proven through governed signed synthetic session evidence.

These are runtime certification gates, not reasons to change DNS or cut over production traffic.

## Cutover Recommendation

Recommendation: NO-GO for production cutover.

Required before cutover authorization:

1. Authorize the App Service staging hostname in Cloudflare Turnstile hostname management, or configure a staging-specific governed Turnstile site/secret pair.
2. Complete governed positive synthetic `/join` intake proof on App Service staging.
3. Complete App Service staging `/api/author/gate` synthetic access-code issuance proof or resolve the App Service access-code configuration propagation issue.
4. Expand monitoring to health/dependency-specific alerts.
5. Preserve final non-sensitive evidence.
6. Jackie explicitly authorizes DNS/cutover timing after reviewing the completed certification package.

No DNS change, production traffic migration, Static Web Apps retirement, Stripe payment action, Business Central posting, broad author activation, secret exposure, or destructive evidence action occurred.
