# Deployment Validation

## Repository State

- Branch: codex/jm1-infra-006-phase2-staging-certification
- HEAD: a3a006bcf8839326f4270e789c1697c0d1ad68b7
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
- Production release setting: JM1_RELEASE_SHA=fbb8ca6190543ec9ac60ed80af41a8d0c8f4883c

## Staging Deployment Refresh

On 2026-07-29, staging auto-swap was disabled after readback showed `autoSwapSlotName: production`. The current PR head, `a3a006bcf8839326f4270e789c1697c0d1ad68b7`, was built as a standalone App Service package and deployed to the staging slot only.

- Package: /tmp/jm1-appsvc-staging-a3a006bcf8839326f4270e789c1697c0d1ad68b7-20260729T111549Z.zip
- Package SHA-256: a6016c1e9b515f2af9a0f37ee0bfe9924b5a4db0030eb7353187eae3ab4c3815
- Active OneDeploy deployment ID: e9dec64d-f2df-4730-999b-424150dfc758
- Prior OneDeploy deployment ID: 6963673f-6cf1-4949-a501-70c67d9a6326
- Inactive OneDeploy record: 3f0c5031-fbb2-4e2f-9309-2f218fc679c1
- Staging release setting: JM1_RELEASE_SHA=a3a006bcf8839326f4270e789c1697c0d1ad68b7
- Auto-swap after correction: disabled

The App Service artifact is now assembled by `scripts/package-app-service-artifact.mjs` through the App Service workflow and local certification path. The package copies `.next/standalone`, `.next/static`, and `public`, writes `JM1_RELEASE_SHA`, removes the root package manifest from the deployable zip, and produces a SHA-256 checksum.

The App Service startup command was updated for staging to:

`node server.js`

Staging app settings now include `WEBSITE_WARMUP_PATH=/api/health`, `WEBSITE_WARMUP_STATUSES=200`, `WEBSITE_SKIP_NODE_MODULES_TAR=1`, `SCM_DO_BUILD_DURING_DEPLOYMENT=false`, and `ENABLE_ORYX_BUILD=false`. Sanitized Kudu logs still show platform `NodeProjectOptimizer` zipping `node_modules` into `node_modules.tar.gz`, so the optimization appears to be App Service platform behavior rather than source package manifest detection alone.

## Production Health

Health check over the App Service target IP with canonical host headers:

- https://jmerrill.pub/api/health: 200, SSL verify result 0
- https://www.jmerrill.pub/api/health: 200, SSL verify result 0
- Reported service: jmerrill-pub
- Reported status: ready
- Reported release: fbb8ca6190543ec9ac60ed80af41a8d0c8f4883c
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

Warm staging health returns 200 ready on the deployed PR head:

- Release: a3a006bcf8839326f4270e789c1697c0d1ad68b7
- Payment gate: disabled
- Route duration: 0-17 ms in sampled warm health responses

Restart-adjacent health remains unstable, though the hardened package recovered:

- Probe file: /tmp/jm1-staging-a3a006b-restart-20probe-20260729T112057Z.jsonl
- Attempts 1-4 returned 200 ready on `a3a006bcf8839326f4270e789c1697c0d1ad68b7`.
- Attempts 5-10 timed out after 20 seconds with no response.
- Attempts 11-20 recovered to 200 ready; uptime reset to 9 seconds on attempt 11.
- Sanitized platform logs show startup probe failure, container stop, later restart, and eventual startup probe success.

Auto-swap remains disabled for the staging slot. Production cutover was performed through DNS and direct production App Service package deployment, not through an automatic slot swap.

## Deployment Exception

Slot-swap validation remains incomplete. An earlier staging-to-production swap attempt hung and did not provide a clean rollback/swap proof. Staging auto-swap has now been disabled to prevent accidental promotion, but no governed swap/rollback exercise has been completed. This is tracked as GATE-W1-EX-003.

App Service CI/CD validation remains incomplete because the new App Service workflow is source-present but not yet proven by a successful governed run. This is tracked as GATE-W1-EX-006.

Staging runtime stability remains incomplete because restart-adjacent health probes timed out before later recovery. This is tracked as GATE-W1-EX-007.
