# Deployment Validation

## Repository State

- Branch: codex/jm1-infra-006-phase2-staging-certification
- HEAD: 16903023640d955c1dc44db18ce8f161e2c9e915
- Base main at PR inspection: f3f2a9fc96627fc23327e58b7eddbe6f50365a93
- PR: #349, draft, open, clean merge state

## GitHub Actions

PR #349 check status at inspection:

- Azure Static Web Apps CI/CD / Build and Deploy Job: success
- Azure Static Web Apps CI/CD / Close Pull Request Job: skipped

## App Service Deployment

The current branch was built with npm and packaged as a standalone Next.js artifact.

- Package: /tmp/jm1-gate-w1-appsvc-production-20260728T145044Z.zip
- Package SHA-256: 4f5ef6159127cbedf2ce8cdb57507de1efc68a651e15a192b9d1df30ab1bfe16
- Production deployment target: app-jm1-pub-prod
- Production deployment method: az webapp deploy, clean package deployment, restart
- Production release setting: JM1_RELEASE_SHA=16903023640d955c1dc44db18ce8f161e2c9e915

## Production Health

Health check over the App Service target IP with canonical host headers:

- https://jmerrill.pub/api/health: 200, SSL verify result 0
- https://www.jmerrill.pub/api/health: 200, SSL verify result 0
- Reported service: jmerrill-pub
- Reported status: ready
- Reported release: 16903023640d955c1dc44db18ce8f161e2c9e915
- Payment gate: disabled

## Staging

The staging slot recovered to healthy after a restart following temporary synthetic access-setting tests:

- https://app-jm1-pub-prod-staging.azurewebsites.net/api/health: 200
- https://app-jm1-pub-prod-staging.azurewebsites.net/: 200
- https://app-jm1-pub-prod-staging.azurewebsites.net/join: 200

Auto-swap remains disabled for the staging slot. Production cutover was performed through DNS and direct production App Service package deployment, not through an automatic slot swap.

## Deployment Exception

Slot-swap validation remains incomplete. An earlier staging-to-production swap attempt hung and did not provide a clean rollback/swap proof. This is tracked as GATE-W1-EX-003.
