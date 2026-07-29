# Deployment Validation

## Repository State

- Branch: codex/jm1-infra-006-phase2-staging-certification
- HEAD: 7c6a043e928723c116715d93acbe61441c45f881
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

On 2026-07-29, staging auto-swap was disabled after readback showed `autoSwapSlotName: production`. The current PR head, `7c6a043e928723c116715d93acbe61441c45f881`, was built as a standalone App Service package and deployed to the staging slot only.

- Package: /tmp/jm1-appsvc-staging-7c6a043e928723c116715d93acbe61441c45f881-20260729T100615Z.zip
- Package SHA-256: 6c95246f44122368e233cc4c6aa01a64baeff8621d606c63565866fe20c95ec6
- Active Kudu deployment ID: e8d57ac2-1492-4503-b14a-a58e88b2a7b6
- Inactive OneDeploy record: 3f0c5031-fbb2-4e2f-9309-2f218fc679c1
- Staging release setting: JM1_RELEASE_SHA=7c6a043e928723c116715d93acbe61441c45f881
- Auto-swap after correction: disabled

The first `az webapp deploy` attempt did not return promptly and was stopped from the operator console; Azure later recorded it as a completed inactive OneDeploy record. A Kudu async zipdeploy then completed successfully and became the active deployment. VFS/readback and runtime health confirmed the staging slot reports the current PR release SHA.

The App Service startup command was updated for staging to:

`bash -lc "cd /home/site/wwwroot && if [ ! -d node_modules/next ] && [ -f node_modules.tar.gz ]; then mkdir -p node_modules && tar -xzf node_modules.tar.gz -C node_modules; fi && exec node server.js"`

This mitigates the observed Kudu package shape where `node_modules` is compressed into `node_modules.tar.gz` and `server.js` cannot resolve `next` until extraction completes. Sanitized Kudu and App Service logs still show Kudu `NodeProjectOptimizer` zipping `node_modules` and Oryx startup extracting it despite `SCM_DO_BUILD_DURING_DEPLOYMENT=false` and `ENABLE_ORYX_BUILD=false`; startup packaging remains a certification concern for cold-start reliability.

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

Warm steady-state staging health now passes on the deployed PR head:

- Probe file: /tmp/jm1-gate-w1-warm-10probe-20260729T101609Z.jsonl
- Count: 10
- Result: all 10 probes returned 200 ready
- Release: 7c6a043e928723c116715d93acbe61441c45f881
- Response-time range: 0.186060 to 0.435309 seconds

Restart-adjacent health remains unstable, though the hardened package recovered:

- Immediately after deployment, `/api/health` returned a plain 500 before explicit restart.
- First post-restart `/api/health`: 200 after approximately 3 seconds, with release match.
- A later restart-adjacent probe sequence observed a transient 502 and multiple 20-second timeout windows before recovery.
- Later warm route health recovered to 200 ready with route duration 1 ms.

Auto-swap remains disabled for the staging slot. Production cutover was performed through DNS and direct production App Service package deployment, not through an automatic slot swap.

## Deployment Exception

Slot-swap validation remains incomplete. An earlier staging-to-production swap attempt hung and did not provide a clean rollback/swap proof. Staging auto-swap has now been disabled to prevent accidental promotion, but no governed swap/rollback exercise has been completed. This is tracked as GATE-W1-EX-003.

App Service CI/CD validation remains incomplete because the new App Service workflow is source-present but not yet proven by a successful governed run. This is tracked as GATE-W1-EX-006.

Staging runtime stability remains incomplete because restart-adjacent health probes timed out before later recovery. This is tracked as GATE-W1-EX-007.
