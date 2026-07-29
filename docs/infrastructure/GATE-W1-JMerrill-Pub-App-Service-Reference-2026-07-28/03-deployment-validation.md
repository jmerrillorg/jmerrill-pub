# Deployment Validation

## Repository State

- Branch: codex/jm1-infra-006-phase2-staging-certification
- HEAD: a9304f2d85af4d6b53fe6d36b957c28f2cdddb40
- Base main at PR inspection: f3f2a9fc96627fc23327e58b7eddbe6f50365a93
- PR: #349, draft, open, clean merge state

## GitHub Actions

PR #349 check status at inspection:

- Azure Static Web Apps CI/CD / Build and Deploy Job: success on f80fab2fbbb0c641f5266d554a104b12823965a6 at 2026-07-29T03:46:58Z
- Azure Static Web Apps CI/CD / Close Pull Request Job: skipped

The checked workflow still deploys Azure Static Web Apps, not App Service. A new Publishing App Service CI/CD workflow was added in source at `.github/workflows/azure-app-service-publishing.yml`, but it has not yet executed successfully and is not yet the active governed release authority.

## App Service Deployment

The current branch was built with npm and packaged as a standalone Next.js artifact.

- Package: /tmp/jm1-gate-w1-appsvc-production-20260728T145044Z.zip
- Package SHA-256: 4f5ef6159127cbedf2ce8cdb57507de1efc68a651e15a192b9d1df30ab1bfe16
- Production deployment target: app-jm1-pub-prod
- Production deployment method: az webapp deploy, clean package deployment, restart
- Production release setting: JM1_RELEASE_SHA=16903023640d955c1dc44db18ce8f161e2c9e915

## Staging Deployment Refresh

On 2026-07-29, staging auto-swap was disabled after readback showed `autoSwapSlotName: production`. A later PR head, `a9304f2d85af4d6b53fe6d36b957c28f2cdddb40`, was built as a standalone App Service package and deployed to the staging slot only.

- Package: /tmp/jm1-appsvc-staging-a9304f2-20260729T074004Z.zip
- Package SHA-256: f8afb6ca890891bddcb049f3422cb1e06b5fc8cefdf6952b228b2618b8a6ee88
- Deployment ID: 855c2c66-c732-486b-8d12-6ab5f9dbfefd
- Staging release setting: JM1_RELEASE_SHA=a9304f2d85af4d6b53fe6d36b957c28f2cdddb40
- Auto-swap after correction: disabled

The first redeploy attempt was stopped by Kudu because an SCM container restart overlapped a management operation. A later async zipdeploy completed successfully and became active. VFS readback confirmed the deployed `/api/health` route bundle contains the new non-secret author-access diagnostics.

The App Service startup command was updated for staging to:

`bash -lc "cd /home/site/wwwroot && if [ ! -d node_modules/next ] && [ -f node_modules.tar.gz ]; then mkdir -p node_modules && tar -xzf node_modules.tar.gz -C node_modules; fi && exec node server.js"`

This corrects the previously observed Kudu package shape where `node_modules` was compressed into `node_modules.tar.gz` and `server.js` could not resolve `next`.

## Production Health

Health check over the App Service target IP with canonical host headers:

- https://jmerrill.pub/api/health: 200, SSL verify result 0
- https://www.jmerrill.pub/api/health: 200, SSL verify result 0
- Reported service: jmerrill-pub
- Reported status: ready
- Reported release: 16903023640d955c1dc44db18ce8f161e2c9e915
- Payment gate: disabled

## Staging

The staging slot recovered after the current standalone package deployment and after restoring Key Vault-backed author settings:

- https://app-jm1-pub-prod-staging.azurewebsites.net/api/health: 200
- https://app-jm1-pub-prod-staging.azurewebsites.net/: 200
- https://app-jm1-pub-prod-staging.azurewebsites.net/join: 200
- https://app-jm1-pub-prod-staging.azurewebsites.net/books: 200
- https://app-jm1-pub-prod-staging.azurewebsites.net/authors: 200
- https://app-jm1-pub-prod-staging.azurewebsites.net/robots.txt: 200
- https://app-jm1-pub-prod-staging.azurewebsites.net/sitemap.xml: 200

Restart-adjacent health remains unstable, though the hardened package recovered:

- First post-restart `/api/health`: 200 after 37.064790 seconds.
- Second and third post-restart `/api/health`: timed out after 45 seconds.
- Later warm route smoke recovered to `/api/health`: 200 after 1.135840 seconds.
- Latest restart after `a9304f2d85af4d6b53fe6d36b957c28f2cdddb40`: early probes returned old in-memory handler responses, then three 30-second timeout windows occurred, then `/api/health` recovered with release match, `uptimeSeconds: 10`, and `durationMs: 1`.

Auto-swap remains disabled for the staging slot. Production cutover was performed through DNS and direct production App Service package deployment, not through an automatic slot swap.

## Deployment Exception

Slot-swap validation remains incomplete. An earlier staging-to-production swap attempt hung and did not provide a clean rollback/swap proof. Staging auto-swap has now been disabled to prevent accidental promotion, but no governed swap/rollback exercise has been completed. This is tracked as GATE-W1-EX-003.

App Service CI/CD validation remains incomplete because the new App Service workflow is source-present but not yet proven by a successful governed run. This is tracked as GATE-W1-EX-006.

Staging runtime stability remains incomplete because restart-adjacent health probes timed out before later recovery. This is tracked as GATE-W1-EX-007.
