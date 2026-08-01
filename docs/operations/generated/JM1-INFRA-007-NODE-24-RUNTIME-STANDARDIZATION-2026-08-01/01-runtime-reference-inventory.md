# Runtime Reference Inventory

Discovery command class:

`rg` across repository for Node/runtime terms, excluding dependency/build output.

## Updated Active Runtime Authority

| Reference | Classification | Disposition |
| --- | --- | --- |
| `package.json` `@types/node` | Active development configuration | Updated from `^20.0.0` to `^24.13.3` |
| `package.json` engines | Active development/runtime contract | Added Node `>=24 <25`, npm `>=11 <12` |
| `package-lock.json` | Generated lockfile | Regenerated under Node 24/npm 11 |
| `.nvmrc` | Active local runtime pin | Added `24` |
| `.github/workflows/azure-app-service-publishing.yml` | Active CI/CD runtime authority | Updated `NODE_VERSION` to `24`; added runtime proof |
| `.github/workflows/azure-static-web-apps.yml` | Historical Publishing SWA authority | Publishing SWA: RETIRED UNDER JM1-INFRA-012 |
| `infra/jm1-infra-006/app-service/main.bicep` | Active App Service IaC | Updated production and staging declarations to `NODE|24-lts`; updated `WEBSITE_NODE_DEFAULT_VERSION` to `~24` |
| `azure-functions/diagnostic-ai-runner/package.json` | Active Function package | Updated Node compatibility window to `>=22 <25`; live host retained on `Node|22` after failed `Node|24` smoke |
| `azure-functions/diagnostic-ai-runner/package-lock.json` | Generated Function lockfile | Regenerated under Node 24/npm 11 |
| `azure-functions/acs-email-relay/package.json` | Active Function package | Updated Node compatibility window to `>=22 <25`; live host retained on `Node|22` after failed `Node|24` smoke |
| `azure-functions/acs-email-relay/package-lock.json` | Generated Function lockfile | Regenerated under Node 24/npm 11 |
| `docs/infrastructure/JM1-INFRA-006-App-Service-Hosting-Standard.md` | Forward-looking runtime standard | Updated to Node 24 LTS |
| `docs/infrastructure/JM1-INFRA-006-Publishing-App-Service-Migration-Runbook.md` | Forward-looking migration authority | Updated to Node 24 LTS |
| `docs/operations/int-pub-005-acs-email-relay-plan.md` | Forward-looking Function runtime plan | Updated to Azure Functions v4, Node.js 24 |

## Retained Historical or Non-Runtime References

| Reference | Classification | Disposition |
| --- | --- | --- |
| Prior evidence packages and incident records mentioning Node 20 | Historical evidence | Retained as past-state truth |
| `FUNCTIONS_WORKER_RUNTIME=node` in local settings examples | Active Function worker model | Retained; this declares worker language, not Node major |
| `@types/node` 25 under `azure-functions/diagnostic-ai-runner/package-lock.json` | Transitive dependency metadata from `docx@9.7.1` | Retained; not an active runtime authority and not a Node 20 reference |

## Remaining Active Node 20 References

None found in active runtime, CI, App Service, Function package, or forward-looking hosting configuration after changes.

## Remaining Active Non-24 Runtime References

| Reference | Classification | Disposition |
| --- | --- | --- |
| `func-jm1-acs-email-relay` Azure runtime | Active Function host runtime | Retained at `Node|22`; attempted `Node|24` returned 503 on protected route, rollback returned 401 |
| `func-jm1-diagnostic-ai-runner` Azure runtime | Active Function host runtime | Retained at `Node|22`; attempted `Node|24` returned 503 on protected route, rollback returned 401 |
| `.github/workflows/azure-static-web-apps.yml` | Historical Publishing SWA runtime | Publishing SWA: RETIRED UNDER JM1-INFRA-012 |
