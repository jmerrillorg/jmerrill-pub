# Deployment Validation

## Repository State

- Branch: codex/jm1-infra-006-phase2-staging-certification
- HEAD: 91152240cc23c2967d32af0e1393d353f1cae6ee
- Base main at PR inspection: f3f2a9fc96627fc23327e58b7eddbe6f50365a93
- PR: #349, draft, open, clean merge state

## GitHub Actions

PR #349 check status at inspection:

- Azure Static Web Apps CI/CD / Build and Deploy Job: success on 91152240cc23c2967d32af0e1393d353f1cae6ee at 2026-07-29T02:01:19Z
- Azure Static Web Apps CI/CD / Close Pull Request Job: skipped

The checked workflow still deploys Azure Static Web Apps, not App Service. Therefore GitHub Actions build validation passed, but App Service release-pipeline validation remains incomplete.

## App Service Deployment

The current branch was built with npm and packaged as a standalone Next.js artifact.

- Package: /tmp/jm1-gate-w1-appsvc-production-20260728T145044Z.zip
- Package SHA-256: 4f5ef6159127cbedf2ce8cdb57507de1efc68a651e15a192b9d1df30ab1bfe16
- Production deployment target: app-jm1-pub-prod
- Production deployment method: az webapp deploy, clean package deployment, restart
- Production release setting: JM1_RELEASE_SHA=16903023640d955c1dc44db18ce8f161e2c9e915

## Staging Deployment Refresh

On 2026-07-29, staging auto-swap was disabled after readback showed `autoSwapSlotName: production`. Current PR head 91152240cc23c2967d32af0e1393d353f1cae6ee was built as a standalone App Service package and deployed to the staging slot only.

- Package: /tmp/jm1-gate-w1-appsvc-staging-20260729T021042Z.zip
- Package SHA-256: ce38298cdc9d901ffd1a064400606c6fd34cabb9b2bf321eb3a6b6f05372a72e
- Deployment ID: af7a6585-e765-4072-b7bb-cae0ef1443fb
- Staging release setting: JM1_RELEASE_SHA=91152240cc23c2967d32af0e1393d353f1cae6ee
- Auto-swap after correction: disabled

## Production Health

Health check over the App Service target IP with canonical host headers:

- https://jmerrill.pub/api/health: 200, SSL verify result 0
- https://www.jmerrill.pub/api/health: 200, SSL verify result 0
- Reported service: jmerrill-pub
- Reported status: ready
- Reported release: 16903023640d955c1dc44db18ce8f161e2c9e915
- Payment gate: disabled

## Staging

The staging slot initially recovered after the current standalone package deployment and after restoring Key Vault-backed author settings:

- https://app-jm1-pub-prod-staging.azurewebsites.net/api/health: 200
- https://app-jm1-pub-prod-staging.azurewebsites.net/: 200
- https://app-jm1-pub-prod-staging.azurewebsites.net/join: 200
- https://app-jm1-pub-prod-staging.azurewebsites.net/books: 200
- https://app-jm1-pub-prod-staging.azurewebsites.net/authors: 200
- https://app-jm1-pub-prod-staging.azurewebsites.net/robots.txt: 200
- https://app-jm1-pub-prod-staging.azurewebsites.net/sitemap.xml: 200

Final readback after the PR check completed did not remain healthy:

- https://app-jm1-pub-prod-staging.azurewebsites.net/api/health: timed out after 20 seconds
- https://app-jm1-pub-prod-staging.azurewebsites.net/api/health: timed out after 60 seconds

Auto-swap remains disabled for the staging slot. Production cutover was performed through DNS and direct production App Service package deployment, not through an automatic slot swap.

## Deployment Exception

Slot-swap validation remains incomplete. An earlier staging-to-production swap attempt hung and did not provide a clean rollback/swap proof. Staging auto-swap has now been disabled to prevent accidental promotion, but no governed swap/rollback exercise has been completed. This is tracked as GATE-W1-EX-003.

App Service CI/CD validation remains incomplete because the active GitHub Actions workflow still targets Azure Static Web Apps. This is tracked as GATE-W1-EX-006.

Staging runtime stability remains incomplete because final health probes timed out after the slot initially recovered. This is tracked as GATE-W1-EX-007.
