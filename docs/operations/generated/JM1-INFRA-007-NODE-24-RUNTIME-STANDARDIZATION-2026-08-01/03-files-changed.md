# Files Changed

## Runtime and Package Metadata

- `.nvmrc`
- `package.json`
- `package-lock.json`
- `azure-functions/diagnostic-ai-runner/package.json`
- `azure-functions/diagnostic-ai-runner/package-lock.json`
- `azure-functions/acs-email-relay/package.json`
- `azure-functions/acs-email-relay/package-lock.json`

Note: Function package metadata now declares `>=22 <25` because the live Function Apps did not certify on `Node|24` and were rolled back to `Node|22`.

## CI/CD

- `.github/workflows/azure-app-service-publishing.yml`
- `.github/workflows/azure-static-web-apps.yml`

## Infrastructure

- `infra/jm1-infra-006/app-service/main.bicep`

## Forward-Looking Documentation

- `docs/infrastructure/JM1-INFRA-006-App-Service-Hosting-Standard.md`
- `docs/infrastructure/JM1-INFRA-006-Publishing-App-Service-Migration-Runbook.md`
- `docs/operations/int-pub-005-acs-email-relay-plan.md`

## Evidence Package

- `docs/operations/generated/JM1-INFRA-007-NODE-24-RUNTIME-STANDARDIZATION-2026-08-01/`

## Excluded

- Historical evidence packages were not rewritten.
- Generated local App Service ZIP artifacts were removed from the worktree and are not included.
