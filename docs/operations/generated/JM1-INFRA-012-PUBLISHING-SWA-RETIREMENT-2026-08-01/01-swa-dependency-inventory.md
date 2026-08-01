# SWA Dependency Inventory

## Azure Resource

| Item | Starting state | Final state |
| --- | --- | --- |
| Static Web App | `jmerrill-pub` in resource group `jmerrill-pub` | Deleted |
| Default hostname | `calm-plant-0f4f58410.6.azurestaticapps.net` | Resource lookup empty; hostname returns 404 |
| Custom domains on SWA | `jmerrill.pub`, `www.jmerrill.pub` | Removed with resource deletion |
| Preview environments | `341`, `349`, `355` plus default | Preview builds deleted; default removed with resource deletion |
| Repository binding | `https://github.com/jmerrillorg/jmerrill-pub` | Removed with resource deletion |
| Staging environment policy | Enabled | Removed with resource deletion |

## Repository Matches

| Match group | Classification | Action |
| --- | --- | --- |
| `.github/workflows/azure-static-web-apps.yml` | Active obsolete Publishing deployment authority | Deleted from source |
| `README.md` active stack/deployment text | Current documentation | Updated to Azure App Service |
| `app/api/join/route.ts` deployment comment | Current source comment | Updated to server/App Service wording |
| INFRA-006 migration docs | Historical migration evidence | Retained as historical truth |
| INFRA-007 evidence | Current exception register | Updated to close SWA as active Publishing exception |
| PROGRAM-002/003/004/005 evidence | Historical evidence | Retained as historical truth |
| Audit notes and old implementation docs | Historical or superseded evidence | Retained |

## GitHub

| Item | Starting state | Final state |
| --- | --- | --- |
| `Azure Static Web Apps CI/CD` workflow | Active | Disabled manually and deleted from source |
| `Publishing App Service CI/CD` workflow | Active | Remains active |
| Classic branch protection | Not configured for `main` | Unchanged |
| Repository rulesets | None returned by GitHub API | Unchanged |
| SWA required check | No required ruleset/classic protection found | Not applicable |

## Secrets and Configuration

| Surface | Starting state | Final state |
| --- | --- | --- |
| GitHub Actions SWA token secrets | Present by name | Deleted |
| SWA app settings | Obsolete app-setting copy present | Removed with SWA resource deletion |
| App Service runtime settings | Key Vault references for sensitive values | Retained |

