# Runtime Register

| App Service | Resource group | Runtime | Public health | Staging health | Notes |
|---|---|---|---|---|---|
| `app-jm1-pub-prod` | `rg-jm1-pub-prod-appsvc` | `NODE|24-lts` | 200 | N/A | Production Publishing site is live and App Service certified |
| `app-jm1-one-prod` | `rg-jm1-web-prod-appsvc` | `NODE|22-lts` | 200 | 200 | Minimal GATE-W3 runtime; `traffic_migrated=false` |
| `app-jm1-fin-prod` | `rg-jm1-web-prod-appsvc` | `NODE|22-lts` | 200 | 200 | Minimal GATE-W3 runtime; `traffic_migrated=false` |
| `app-jm1-foundation-prod` | `rg-jm1-web-prod-appsvc` | `NODE|22-lts` | 200 | 200 | Minimal GATE-W3 runtime; `traffic_migrated=false` |
| `app-jm1-productions-prod` | `rg-jm1-web-prod-appsvc` | `NODE|22-lts` | 503 | 200 | Known GATE-W3 Productions exception |
| `app-jm1-jackiesmithjr-prod` | `rg-jm1-web-prod-appsvc` | `NODE|20-lts` | Not certified under this gate | Not certified under this gate | Separate personal-brand lane |
| `aic-app-service-prod` | `agape-international-cathedral-rg` | `NODE|20-lts` | Separate AIC lane | N/A | Separate enterprise |

## Node Standardization Note

`jmerrill.pub` is aligned to Node 24. The shared GATE-W3 minimal runtime apps remain Node 22 except personal/separate lanes. Node 24 normalization for the broader estate is governed by JM1-INFRA-007 and must not be silently folded into INFRA-013.

