# App Service Authority Proof

## DNS

| Host | Result |
| --- | --- |
| `jmerrill.pub` | A record resolves to `40.122.114.229`, App Service production outbound/host IP observed in Azure readback |
| `www.jmerrill.pub` | CNAME to `app-jm1-pub-prod.azurewebsites.net`; resolves to `40.122.114.229` |
| `app-jm1-pub-prod.azurewebsites.net` | Resolves through Azure App Service CNAME chain to `40.122.114.229` |
| `app-jm1-pub-prod-staging.azurewebsites.net` | Resolves through Azure App Service CNAME chain to `40.122.114.229` |

## App Service Production

| Property | Value |
| --- | --- |
| Resource group | `rg-jm1-pub-prod-appsvc` |
| App | `app-jm1-pub-prod` |
| State | Running |
| Runtime | `NODE|24-lts` |
| HTTPS only | true |
| Health check | `/api/health` |
| Always On | true |
| Managed identity | System-assigned |
| Custom domains | `jmerrill.pub`, `www.jmerrill.pub` |
| SSL | SNI enabled for both custom domains |

## App Service Staging

| Property | Value |
| --- | --- |
| Slot | `staging` |
| Hostname | `app-jm1-pub-prod-staging.azurewebsites.net` |
| State | Running |
| Runtime | `NODE|24-lts` |
| HTTPS only | true |
| Managed identity | System-assigned |

## Runtime Health

Production `/api/health` returned `ready` with release `77230c077f37910f75cf7b274734475ac1a92d3e`. Dependencies reported ready for configuration, Dataverse, Graph/SharePoint, ACS relay, artifact configuration, author portal session configuration, and Stripe enrollment configuration. Payment gate returned `disabled`.

