# GitHub Workflow Retirement

## Removed Workflow

Deleted from source:

- `.github/workflows/azure-static-web-apps.yml`

Disabled in GitHub:

- Workflow name: `Azure Static Web Apps CI/CD`
- Workflow ID: `191552235`
- Final observed state: `disabled_manually`

## Replacement Workflow

Publishing deployment authority is now:

- Workflow name: `Publishing App Service CI/CD`
- Workflow ID: `322959873`
- Status: active

The replacement workflow builds an immutable standalone artifact, deploys to `app-jm1-pub-prod/staging`, validates staging health, and promotes to production only through the governed production workflow path.

## Source Changes

| File | Change |
| --- | --- |
| `.github/workflows/azure-static-web-apps.yml` | Deleted |
| `README.md` | Updated stack/deployment authority to Azure App Service |
| `app/api/join/route.ts` | Updated deployment comment |

